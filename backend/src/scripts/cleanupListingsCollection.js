require("dotenv").config();

const listingModel = require("../models/listingModel");

async function main() {
  const listings = await listingModel.listListings();
  const nonDecoded = listings.filter((listing) => listing.decode_status !== "decoded");

  for (const listing of nonDecoded) {
    await listingModel.deleteListing(listing.id);
  }

  console.log(
    JSON.stringify(
      {
        checked: listings.length,
        deleted: nonDecoded.length,
        remaining: listings.length - nonDecoded.length,
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
