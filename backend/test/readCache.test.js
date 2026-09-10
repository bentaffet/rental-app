const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ReadCache } = require('../src/utils/readCache');

test('coalesces concurrent reads, expires, and does not cache failures', async () => {
  let now = 0;
  const cache = new ReadCache({ now: () => now });
  let calls = 0;
  const load = async () => { calls++; return [{ id: 'a' }]; };
  await Promise.all(Array.from({ length: 100 }, () => cache.get('list', 60, load)));
  assert.equal(calls, 1);
  now = 60;
  await cache.get('list', 60, load);
  assert.equal(calls, 2);
  await assert.rejects(cache.get('error', 60, async () => { throw Error('offline'); }));
  assert.equal(await cache.get('error', 60, async () => 'recovered'), 'recovered');
});

test('write-through preserves expiration and prevents old reads repopulating cache', async () => {
  let now = 0;
  const cache = new ReadCache({ now: () => now });
  await cache.get('a', 60, async () => ({ status: 'pending' }));
  now = 50;
  cache.update('a', () => ({ status: 'decoded' }));
  assert.equal(cache.peek('a').status, 'decoded');
  now = 60;
  assert.equal(cache.peek('a'), undefined);
  let resolve;
  const reading = cache.get('a', 60, () => new Promise((done) => { resolve = done; }));
  await Promise.resolve();
  cache.update('a', () => ({ status: 'new' }));
  resolve({ status: 'old' });
  await reading;
  assert.equal(cache.peek('a'), undefined);
});

test('bounds retained bytes and entries and supports disabling', async () => {
  const cache = new ReadCache({ maxEntries: 2, maxBytes: 20 });
  for (const key of ['a', 'b', 'c']) await cache.get(key, 1000, async () => '12345');
  assert.equal(cache.peek('a'), undefined);
  assert.ok(cache.bytes <= 20);
  await cache.get('huge', 1000, async () => 'x'.repeat(100));
  assert.equal(cache.peek('huge'), undefined);
  await cache.get('off', 0, async () => 'no cache');
  assert.equal(cache.peek('off'), undefined);
});
