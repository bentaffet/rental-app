const fs = require("fs");
const path = require("path");

const { hasFirebaseConfig, initializeFirebase } = require("../../firebase");

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
    localCache = { brightdata_jobs: {}, raw_posts: {}, listings: {} };
    return localCache;
  }

  localCache = JSON.parse(fs.readFileSync(localDataPath, "utf8"));
  return localCache;
}

function writeLocalData(data) {
  fs.mkdirSync(path.dirname(localDataPath), { recursive: true });
  fs.writeFileSync(localDataPath, JSON.stringify(data, null, 2));
}

async function getDocument(collection, id) {
  if (shouldUseLocalDatastore()) {
    return readLocalData()[collection]?.[id] || null;
  }

  const snapshot = await getFirestoreDb().collection(collection).doc(id).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
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
}

async function listDocuments(collection) {
  if (shouldUseLocalDatastore()) {
    return Object.values(readLocalData()[collection] || {});
  }

  const snapshot = await getFirestoreDb().collection(collection).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  deleteDocument,
  getDatastoreMode,
  getDocument,
  setDocument,
  listDocuments,
};
