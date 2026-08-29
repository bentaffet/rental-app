const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

let cachedDb;

function normalizePrivateKey(value) {
  return value ? value.replace(/\\n/g, "\n") : value;
}

function getServiceAccountFromJson() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!rawJson) {
    return null;
  }

  try {
    const serviceAccount = JSON.parse(rawJson);
    return {
      ...serviceAccount,
      private_key: normalizePrivateKey(serviceAccount.private_key),
    };
  } catch (error) {
    throw new Error("Firebase service account JSON env var is not valid JSON");
  }
}

function getServiceAccountFromFields() {
  return null;
}

function hasFirebaseConfig() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  );
}

function getFirebaseProjectId(serviceAccount) {
  return serviceAccount?.project_id;
}

function initializeFirebase() {
  if (cachedDb) {
    return cachedDb;
  }

  if (getApps().length) {
    cachedDb = getFirestore();
    return cachedDb;
  }

  const serviceAccount = getServiceAccountFromJson() || getServiceAccountFromFields();

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: getFirebaseProjectId(serviceAccount),
    });
    cachedDb = getFirestore();
    return cachedDb;
  }

  return null;
}

module.exports = {
  hasFirebaseConfig,
  initializeFirebase,
};
