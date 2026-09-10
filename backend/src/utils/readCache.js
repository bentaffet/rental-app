// Shared by requests in one server process. Pending reads are coalesced too.
class ReadCache {
  constructor({ maxEntries = 1000, maxBytes = 32 * 1024 * 1024, now = Date.now } = {}) {
    this.entries = new Map();
    this.maxEntries = maxEntries;
    this.maxBytes = maxBytes;
    this.bytes = 0;
    this.now = now;
  }

  remove(key) {
    const entry = this.entries.get(key);
    this.bytes -= entry?.bytes || 0;
    this.entries.delete(key);
  }

  peek(key) {
    const entry = this.entries.get(key);
    if (!entry || entry.promise) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.remove(key);
      return undefined;
    }
    return entry.value;
  }

  store(key, value, expiresAt) {
    this.remove(key);
    const bytes = Buffer.byteLength(JSON.stringify(value));
    if (bytes > this.maxBytes || expiresAt <= this.now()) return;
    while (this.entries.size >= this.maxEntries || this.bytes + bytes > this.maxBytes) {
      this.remove(this.entries.keys().next().value);
    }
    this.entries.set(key, { value, expiresAt, bytes });
    this.bytes += bytes;
  }

  update(key, transform) {
    const value = this.peek(key);
    const expiresAt = this.entries.get(key)?.expiresAt;
    // A read started before a write must not repopulate the cache afterwards.
    this.remove(key);
    if (value !== undefined) this.store(key, transform(value), expiresAt);
  }

  async get(key, ttlMs, loader) {
    if (ttlMs <= 0) return loader();
    const cached = this.peek(key);
    if (cached !== undefined) return cached;
    const pending = this.entries.get(key);
    if (pending?.promise) return pending.promise;
    const entry = {};
    entry.promise = Promise.resolve().then(loader).then((value) => {
      if (this.entries.get(key) === entry) {
        this.store(key, value, this.now() + ttlMs);
      }
      return value;
    }, (error) => {
      if (this.entries.get(key) === entry) this.remove(key);
      throw error;
    });
    while (this.entries.size >= this.maxEntries) {
      this.remove(this.entries.keys().next().value);
    }
    this.entries.set(key, entry);
    return entry.promise;
  }
}

module.exports = { ReadCache };
