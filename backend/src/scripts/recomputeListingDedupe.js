require("dotenv").config();

const listingModel = require("../models/listingModel");
const rawPostModel = require("../models/rawPostModel");
const { applyDedupeState } = require("../services/listingDedupeService");
const { photoUrls } = require("../services/listingDecodeService");
const { fingerprintPhotoUrls, HASH_VERSION } = require("../services/imageFingerprintService");

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  const listings = (await listingModel.listListings()).filter(
    (listing) => listing.decode_status === "decoded"
  );
  const rawPosts = await rawPostModel.listRawPosts();
  const rawPostsById = new Map(rawPosts.map((post) => [post.id, post]));
  let fingerprinted = 0;
  const listingsWithPhotos = await mapWithConcurrency(listings, 5, async (listing) => {
    const rawPost = rawPostsById.get(listing.id);
    const imageUrls = rawPost ? photoUrls(rawPost) : listing.image_urls || [];
    const hasCurrentHashes =
      listing.image_hash_version === HASH_VERSION && Array.isArray(listing.image_hashes);
    const imageHashes = hasCurrentHashes
      ? listing.image_hashes
      : await fingerprintPhotoUrls(imageUrls);

    if (!hasCurrentHashes) {
      fingerprinted += 1;
      if (fingerprinted % 10 === 0) {
        console.error(`Fingerprint backfill: ${fingerprinted}/${listings.length}`);
      }
    }

    return {
      ...listing,
      image_urls: imageUrls,
      image_hash_version: HASH_VERSION,
      image_hashes: imageHashes,
    };
  });
  const updatedListings = applyDedupeState(listingsWithPhotos);

  for (const listing of updatedListings) {
    await listingModel.upsertListing(listing.id, listing);
  }

  console.log(
    JSON.stringify(
      {
        checked: listings.length,
        updated: updatedListings.length,
        fingerprinted,
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
