require("dotenv").config();

const listingModel = require("../models/listingModel");
const rawPostModel = require("../models/rawPostModel");
const { repairLocationFromText } = require("../services/listingDecodeService");

async function main() {
  const listings = (await listingModel.listListings()).filter(
    (listing) => listing.decode_status === "decoded"
  );
  let updated = 0;

  for (const listing of listings) {
    const rawPost = await rawPostModel.getRawPost(listing.id);

    if (!rawPost) {
      continue;
    }

    const repaired = repairLocationFromText(rawPost, listing);
    const changed =
      repaired.neighborhood !== listing.neighborhood ||
      repaired.city !== listing.city ||
      repaired.state !== listing.state;

    if (!changed) {
      continue;
    }

    await listingModel.upsertListing(listing.id, {
      ...repaired,
      updated_at: new Date().toISOString(),
    });
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        checked: listings.length,
        updated,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
