require("dotenv").config();

const listingModel = require("../models/listingModel");
const { applyDedupeState } = require("../services/listingDedupeService");

async function main() {
  const listings = (await listingModel.listListings()).filter(
    (listing) => listing.decode_status === "decoded"
  );
  const updatedListings = applyDedupeState(listings);

  for (const listing of updatedListings) {
    await listingModel.upsertListing(listing.id, listing);
  }

  console.log(
    JSON.stringify(
      {
        checked: listings.length,
        updated: updatedListings.length,
        duplicates: updatedListings.filter((listing) => listing.is_duplicate).length,
        visible: updatedListings.filter((listing) => !listing.is_duplicate).length,
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
