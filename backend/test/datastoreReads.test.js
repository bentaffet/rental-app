const { test } = require('node:test');
const assert = require('node:assert/strict');

// Fake Firestore counts returned documents, not just network calls. Never loads
// credentials or contacts production Firebase.
const records = { listings: new Map(), raw_posts: new Map() };
let reads = 0;
let queries = [];
const snapshot = (id, value) => ({ id, exists: value !== undefined, data: () => value });
const db = {
  collection(name) {
    const rows = records[name] ||= new Map();
    const buildQuery = (field, values, limit) => ({
      where: (nextField, op, nextValues) => {
        assert.equal(op, 'in');
        return buildQuery(nextField, nextValues, limit);
      },
      limit: (nextLimit) => buildQuery(field, values, nextLimit),
      async get() {
        queries.push({ name, field, limit });
        const matches = [...rows].filter(([, value]) => !field || values.includes(value[field]));
        const selected = limit === undefined ? matches : matches.slice(0, limit);
        reads += Math.max(1, selected.length);
        return { docs: selected.map(([id, value]) => snapshot(id, structuredClone(value))) };
      },
      doc: (id) => ({
        async get() { reads++; return snapshot(id, structuredClone(rows.get(id))); },
        async set(value) { rows.set(id, { ...rows.get(id), ...structuredClone(value) }); },
        async delete() { rows.delete(id); },
      }),
    });
    return buildQuery();
  },
};
const firebasePath = require.resolve('../firebase');
require.cache[firebasePath] = { id: firebasePath, filename: firebasePath, loaded: true,
  exports: { hasFirebaseConfig: () => true, initializeFirebase: () => db } };
process.env.USE_LOCAL_DATASTORE = 'false';
process.env.FIRESTORE_READ_CACHE_SECONDS = '60';
const datastore = require('../src/models/datastore');
const rawPostModel = require('../src/models/rawPostModel');

test('100 concurrent page loads read 100 listings once; writes/deletes need no reread', async () => {
  for (let i = 0; i < 100; i++) records.listings.set(String(i), { id: String(i), title: 'Original' });
  const before = reads;
  await Promise.all(Array.from({ length: 100 }, () => datastore.listDocuments('listings')));
  assert.equal(reads - before, 100);
  const first = await datastore.listDocuments('listings');
  first[0].title = 'Caller mutation';
  assert.equal((await datastore.getDocument('listings', '0')).title, 'Original');
  await datastore.setDocument('listings', '0', { title: 'Updated' });
  await datastore.deleteDocument('listings', '1');
  const next = await datastore.listDocuments('listings');
  assert.equal(next.length, 99);
  assert.equal(next.find((row) => row.id === '0').title, 'Updated');
  assert.equal(await datastore.getDocument('listings', '1'), null);
  assert.equal(reads - before, 100);
  records.listings.set('0', { id: '0', title: 'External write' });
  assert.equal((await datastore.getDocument('listings', '0', { fresh: true })).title, 'External write');
});

test('decode batch reads only five eligible posts out of 10,000 and queries fresh status', async () => {
  for (let i = 0; i < 10000; i++) records.raw_posts.set(String(i), {
    id: String(i), decoded_status: i < 10 ? 'pending' : 'decoded',
  });
  const before = reads;
  const batch = await rawPostModel.listPendingDecode(5);
  assert.equal(batch.length, 5);
  assert.ok(batch.every((post) => post.decoded_status === 'pending'));
  assert.equal(reads - before, 5);
  for (const post of batch) await rawPostModel.upsertRawPost(post.id, { ...post, decoded_status: 'decoded' });
  const next = await rawPostModel.listPendingDecode(5);
  assert.equal(next.length, 5);
  assert.ok(next.every((post) => !batch.some((old) => old.id === post.id)));
  assert.equal(reads - before, 10);
  assert.ok(queries.filter((query) => query.name === 'raw_posts').every((query) => query.limit === 5));
});

test('failed reset query excludes completed records', async () => {
  records.raw_posts.set('failed', { id: 'failed', decoded_status: 'decode_failed' });
  records.raw_posts.set('busy', { id: 'busy', decoded_status: 'decoding' });
  const before = reads;
  assert.equal((await rawPostModel.listFailedDecodes()).length, 2);
  assert.equal(reads - before, 2);
});

test('repeat records within a scrape read existing state only once', async () => {
  const { importBrightDataPayload } = require('../src/services/brightDataImportService');
  const post = { group_id: 'group', post_id: 'post', content: 'A room', attachments: [] };
  const before = reads;
  const result = await importBrightDataPayload([post, post, post]);
  assert.equal(result.imported, 1);
  assert.equal(result.skipped, 2);
  assert.equal(result.decodeQueued, 1);
  assert.equal(reads - before, 1);
});

test('metadata-only scrape changes queue a new decode, unchanged deliveries do not', async () => {
  const { importBrightDataPayload } = require('../src/services/brightDataImportService');
  const post = { group_id: 'metadata', post_id: 'post', content: 'A room', attachments: [], price: 3600, location: 'Ozone Park, NY' };
  await importBrightDataPayload([post]);
  const id = 'metadata_post';
  records.raw_posts.set(id, { ...records.raw_posts.get(id), decoded_status: 'decoded' });
  const unchanged = await importBrightDataPayload([post]);
  assert.equal(unchanged.skipped, 1);
  assert.equal(unchanged.decodeQueued, 0);
  const changed = await importBrightDataPayload([{ ...post, price: 3700 }]);
  assert.equal(changed.updated, 1);
  assert.equal(changed.decodeQueued, 1);
  assert.equal(records.raw_posts.get(id).raw_payload.price, 3700);
});
