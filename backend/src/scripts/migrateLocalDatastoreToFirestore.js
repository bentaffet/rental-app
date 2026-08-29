require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { hasFirebaseConfig, initializeFirebase } = require("../../firebase");

const localDataPath = path.join(__dirname, "../../data/local-datastore.json");

async function writeCollectionBatch(db, collectionName, recordsById) {
  const entries = Object.entries(recordsById || {});
  let written = 0;

  for (let index = 0; index < entries.length; index += 450) {
    const batch = db.batch();
    const chunk = entries.slice(index, index + 450);

    for (const [id, value] of chunk) {
      batch.set(db.collection(collectionName).doc(id), value, { merge: true });
    }

    await batch.commit();
    written += chunk.length;
  }

  return written;
}

async function main() {
  if (!hasFirebaseConfig()) {
    console.log("Firebase config missing.");
    process.exit(1);
  }

  if (!fs.existsSync(localDataPath)) {
    console.log("No local datastore found.");
    return;
  }

  const localData = JSON.parse(fs.readFileSync(localDataPath, "utf8"));
  const db = initializeFirebase();

  const result = {
    brightdata_jobs: await writeCollectionBatch(
      db,
      "brightdata_jobs",
      localData.brightdata_jobs
    ),
    raw_posts: await writeCollectionBatch(db, "raw_posts", localData.raw_posts),
    listings: await writeCollectionBatch(db, "listings", localData.listings),
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
