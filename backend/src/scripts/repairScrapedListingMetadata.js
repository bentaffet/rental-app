if (require.main === module) require("dotenv").config({ quiet: true });
const { initializeFirebase } = require("../../firebase");
const datastore = require("../models/datastore");
const { applyScrapedMetadata } = require("../services/scrapedListingMetadata");
const { buildDedupeKey } = require("../services/listingDedupeService");

function repairPatch(rawPost, listing) {
  if (!rawPost || listing?.decode_status !== "decoded") return {};
  const repaired = applyScrapedMetadata(rawPost, listing);
  const patch = {};
  for (const key of ["price", "neighborhood", "borough", "city", "state"]) {
    if (repaired[key] !== listing[key]) patch[key] = repaired[key];
  }
  if (Object.keys(patch).length) patch.dedupe_key = buildDedupeKey(repaired);
  return patch;
}

async function main() {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf("--id");
  const id = idIndex >= 0 ? args[idIndex + 1] : null;
  if (!id || id.startsWith("--") || id.includes("/")) {
    throw Error("Provide --id DOCUMENT_ID; add --apply to save the repair. Only that document is read.");
  }
  const apply = args.includes("--apply");
  let patch;
  if (datastore.getDatastoreMode() === "firestore") {
    const db = initializeFirebase();
    const rawRef = db.collection("raw_posts").doc(id);
    const listingRef = db.collection("listings").doc(id);
    // Recompute from current records in a transaction so a concurrent decode or
    // manual correction cannot be overwritten using an outdated preview.
    patch = await db.runTransaction(async (transaction) => {
      const [raw, listing] = await transaction.getAll(rawRef, listingRef);
      if (!raw.exists || !listing.exists) throw Error("Raw post or listing not found");
      const changes = repairPatch(raw.data(), listing.data());
      if (apply && Object.keys(changes).length) {
        transaction.update(listingRef, { ...changes, updated_at: new Date().toISOString() });
      }
      return changes;
    });
  } else {
    const raw = await datastore.getDocument("raw_posts", id);
    const listing = await datastore.getDocument("listings", id);
    if (!raw || !listing) throw Error("Raw post or listing not found");
    patch = repairPatch(raw, listing);
    if (apply && Object.keys(patch).length) {
      await datastore.setDocument("listings", id, { ...listing, ...patch, updated_at: new Date().toISOString() });
    }
  }
  console.log(JSON.stringify({ id, applied: apply && Object.keys(patch).length > 0, changes: patch }, null, 2));
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { repairPatch };
