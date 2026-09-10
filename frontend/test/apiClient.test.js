import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../src/utils/apiClient.js', import.meta.url), 'utf8'))
  .replace('import.meta.env.VITE_API_BASE_URL', 'undefined');

test('listing cache coalesces requests, expires without sliding, and invalidates after decode', async () => {
  const oldFetch = globalThis.fetch;
  const oldWindow = globalThis.window;
  const oldNow = Date.now;
  let now = 1000;
  let requests = 0;
  const storage = new Map();
  globalThis.window = { sessionStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  } };
  Date.now = () => now;
  globalThis.fetch = async () => {
    requests++;
    return { ok: true, json: async () => ({ listings: [{ id: 'a' }] }) };
  };
  try {
    const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    await Promise.all([api.getListings(), api.getListings()]);
    await api.getListing('a');
    assert.equal(requests, 1);
    now += 299999;
    await api.getListings();
    assert.equal(requests, 1);
    now++;
    await api.getListings();
    assert.equal(requests, 2);
    await api.decodePendingListings();
    await api.getListings();
    assert.equal(requests, 4);
    api.cacheListings([]);
    assert.deepEqual((await api.getListings()).listings, []);
    assert.equal(requests, 4);
    window.sessionStorage.setItem = () => { throw Error('Storage full'); };
    api.cacheListings([{ id: 'b' }]);
    assert.equal((await api.getListing('b')).listing.id, 'b');
    assert.equal(requests, 4);
    now += 300000;
    globalThis.fetch = async () => { throw Error('Offline'); };
    await assert.rejects(api.getListings(), /Offline/);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ listings: [] }) });
    assert.deepEqual(await api.getListings(), { listings: [] });
  } finally {
    globalThis.fetch = oldFetch;
    globalThis.window = oldWindow;
    Date.now = oldNow;
  }
});
