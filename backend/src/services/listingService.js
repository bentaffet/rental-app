const listingModel = require("../models/listingModel");
const { visibleListingsOnly } = require("./listingDedupeService");
const { visibleByLifecycle } = require("./listingLifecycleService");

function includesText(value, query) {
  return String(value || "").toLowerCase().includes(query);
}

async function searchListings(query = {}) {
  const listings = visibleByLifecycle(
    visibleListingsOnly(await listingModel.listListings()),
    {
      includeStale: query.include_stale === "true",
      includeArchived: query.include_archived === "true",
    }
  );
  const text = String(query.q || "").trim().toLowerCase();
  const maxPrice = query.max_price ? Number(query.max_price) : null;

  return listings.filter((listing) => {
    const isDecodedListing = listing.decode_status === "decoded";
    const matchesText =
      !text ||
      [
        listing.title,
        listing.summary,
        listing.neighborhood,
        listing.borough,
        listing.group_name,
        listing.room_type,
      ].some((value) => includesText(value, text));

    const matchesPrice = !maxPrice || !listing.price || listing.price <= maxPrice;
    const matchesBorough = !query.borough || listing.borough === query.borough;
    const matchesRoomType = !query.room_type || listing.room_type === query.room_type;

    return (
      isDecodedListing &&
      matchesText &&
      matchesPrice &&
      matchesBorough &&
      matchesRoomType
    );
  });
}

async function getListingById(id) {
  return listingModel.getListing(id);
}

module.exports = {
  searchListings,
  getListingById,
};
