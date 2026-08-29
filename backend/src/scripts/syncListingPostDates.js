require("dotenv").config();

const listingModel = require("../models/listingModel");
const rawPostModel = require("../models/rawPostModel");

async function main() {
  const listings = await listingModel.listListings();
  let updated = 0;

  for (const listing of listings) {
    if (listing.date_posted) {
      continue;
    }

    const rawPost = await rawPostModel.getRawPost(listing.id);

    if (!rawPost?.date_posted) {
      continue;
    }

    await listingModel.upsertListing(listing.id, {
      ...listing,
      date_posted: rawPost.date_posted,
      updated_at: new Date().toISOString(),
    });
    updated += 1;
  }

  console.log(JSON.stringify({ checked: listings.length, updated }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
