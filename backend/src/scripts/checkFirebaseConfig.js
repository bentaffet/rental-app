require("dotenv").config();

const { hasFirebaseConfig, initializeFirebase } = require("../../firebase");

async function main() {
  if (!hasFirebaseConfig()) {
    console.log("Firebase config missing.");
    console.log("Set USE_LOCAL_DATASTORE=false only after Firebase credentials are added.");
    process.exit(1);
  }

  const db = initializeFirebase();
  await db.collection("_health").doc("backend").set(
    {
      checked_at: new Date().toISOString(),
      service: "rental-api",
    },
    { merge: true }
  );

  console.log("Firebase config works.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
