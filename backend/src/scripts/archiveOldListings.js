require("dotenv").config();

const listingModel = require("../models/listingModel");
const { applyListingLifecycle } = require("../services/listingLifecycleService");

async function main() {
  const listings = (await listingModel.listListings()).filter(
    (listing) => listing.decode_status === "decoded"
  );
  const updatedListings = listings.map((listing) => applyListingLifecycle(listing));

  for (const listing of updatedListings) {
    await listingModel.upsertListing(listing.id, listing);
  }

  console.log(
    JSON.stringify(
      {
        checked: listings.length,
        active: updatedListings.filter((listing) => listing.listing_status === "active")
          .length,
        stale: updatedListings.filter((listing) => listing.listing_status === "stale")
          .length,
        archived: updatedListings.filter(
          (listing) => listing.listing_status === "archived"
        ).length,
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
