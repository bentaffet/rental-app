const fs = require("fs");
const path = require("path");

const { hasFirebaseConfig, initializeFirebase } = require("../../firebase");
const { ReadCache } = require("../utils/readCache");

const readCache = new ReadCache();

function cacheTtlMs() {
  const seconds = Number(process.env.FIRESTORE_READ_CACHE_SECONDS ?? 60);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 60000;
}

// Firestore merge writes recursively merge non-empty maps; arrays and empty
// maps replace the old value. All application records use JSON-compatible data.
function mergeRecord(existing, value) {
  const result = { ...existing };
  for (const [key, next] of Object.entries(value)) {
    result[key] = next && Object.getPrototypeOf(next) === Object.prototype && Object.keys(next).length
      ? mergeRecord(existing?.[key], next)
      : next;
  }
  return result;
}

function updateCachedDocument(collection, id, value) {
  const update = (previous) => value === null ? null : mergeRecord(previous, value);
  readCache.update(`doc:${collection}/${id}`, update);
  readCache.update(`list:${collection}`, (records) => {
    const next = { ...records };
    if (value === null) delete next[id];
    else next[id] = { id, ...update(records[id]) };
    return next;
  });
}

const localDataPath = path.join(__dirname, "../../data/local-datastore.json");
let localCache = null;
let firestoreDb;

function shouldUseLocalDatastore() {
  return process.env.USE_LOCAL_DATASTORE !== "false" || !hasFirebaseConfig();
}

function getFirestoreDb() {
  if (!firestoreDb) {
    firestoreDb = initializeFirebase();
  }

  return firestoreDb;
}

function getDatastoreMode() {
  return shouldUseLocalDatastore() ? "local" : "firestore";
}

function readLocalData() {
  if (localCache) {
    return localCache;
  }

  if (!fs.existsSync(localDataPath)) {
    localCache = { brightdata_jobs: {}, raw_posts: {}, listings: {}, tracked_groups: {} };
    return localCache;
  }

  localCache = JSON.parse(fs.readFileSync(localDataPath, "utf8"));
  return localCache;
}

function writeLocalData(data) {
  fs.mkdirSync(path.dirname(localDataPath), { recursive: true });
  fs.writeFileSync(localDataPath, JSON.stringify(data, null, 2));
}

async function getDocument(collection, id, { fresh = false } = {}) {
  if (shouldUseLocalDatastore()) {
    return readLocalData()[collection]?.[id] || null;
  }

  const records = !fresh && readCache.peek(`list:${collection}`);
  if (records) return structuredClone(records[id] || null);
  const value = await readCache.get(`doc:${collection}/${id}`, fresh ? 0 : cacheTtlMs(), async () => {
    const snapshot = await getFirestoreDb().collection(collection).doc(id).get();
    return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  });
  return structuredClone(value);
}

async function setDocument(collection, id, value) {
  if (shouldUseLocalDatastore()) {
    const data = readLocalData();
    data[collection] = data[collection] || {};
    data[collection][id] = value;
    writeLocalData(data);
    return value;
  }

  await getFirestoreDb().collection(collection).doc(id).set(value, { merge: true });
  updateCachedDocument(collection, id, value);
  return value;
}

async function deleteDocument(collection, id) {
  if (shouldUseLocalDatastore()) {
    const data = readLocalData();
    if (data[collection]) {
      delete data[collection][id];
      writeLocalData(data);
    }
    return;
  }

  await getFirestoreDb().collection(collection).doc(id).delete();
  updateCachedDocument(collection, id, null);
}

async function listDocuments(collection) {
  if (shouldUseLocalDatastore()) {
    return Object.values(readLocalData()[collection] || {});
  }

  const records = await readCache.get(`list:${collection}`, cacheTtlMs(), async () => {
    const snapshot = await getFirestoreDb().collection(collection).get();
    return Object.fromEntries(snapshot.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]));
  });
  return structuredClone(Object.values(records));
}

// Queue queries intentionally bypass the cache so another worker's completed
// posts do not keep being selected. Single-field queries need no composite index.
async function listDocumentsByField(collection, field, values, limit) {
  if (!values.length || limit === 0) return [];
  if (shouldUseLocalDatastore()) {
    const matches = Object.values(readLocalData()[collection] || {})
      .filter((record) => values.includes(record[field]))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return limit === undefined ? matches : matches.slice(0, limit);
  }
  let query = getFirestoreDb().collection(collection).where(field, "in", values);
  if (limit !== undefined) query = query.limit(limit);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  deleteDocument,
  getDatastoreMode,
  getDocument,
  setDocument,
  listDocuments,
  listDocumentsByField,
};
