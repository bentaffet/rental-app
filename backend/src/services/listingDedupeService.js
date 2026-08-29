function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\bkings?\s*hwy\b/g, "kings highway")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(st|station|stop|train|subway|line|near|the|and|at|by)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedPriceBucket(price) {
  if (!Number.isFinite(price)) {
    return "unknown-price";
  }

  return String(Math.round(price / 250) * 250);
}

function normalizeAvailability(listing) {
  return (
    listing.available_from ||
    normalizeText(listing.availability_text || "").split(" ").slice(0, 3).join("-") ||
    "unknown-start"
  );
}

function normalizeBedsBaths(value) {
  return Number.isFinite(value) ? String(value) : "unknown";
}

function roomTypeKey(listing) {
  const roomType = normalizeText(listing.room_type || "");

  if (roomType === "entire place" || roomType === "studio") {
    return roomType;
  }

  if (
    roomType === "private room" ||
    roomType === "shared room" ||
    (roomType === "unknown" && Number(listing.bedrooms) > 1)
  ) {
    return "shared housing";
  }

  return roomType || "unknown";
}

function transitKey(listing) {
  const transit = (listing.transit || []).map(normalizeText).join(" ");

  if (/kings?\s*highway/.test(transit)) {
    return "kings-highway";
  }

  return transit.split(" ").filter(Boolean).slice(0, 4).join("-");
}

function locationKey(listing) {
  const locationText = [
    listing.neighborhood,
    listing.borough,
    listing.city,
    transitKey(listing),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  if (/kings?\s*highway/.test(locationText) && /brooklyn/.test(locationText)) {
    return "kings-highway-brooklyn";
  }

  return Array.from(new Set(locationText.split(" ").filter(Boolean))).join("-");
}

function buildDedupeKey(listing) {
  return [
    locationKey(listing) || "unknown-location",
    roomTypeKey(listing),
    normalizeBedsBaths(listing.bedrooms),
    normalizeBedsBaths(listing.bathrooms),
    normalizedPriceBucket(listing.price),
    normalizeAvailability(listing),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join("__");
}

function listingScore(listing) {
  let score = 0;

  if (listing.price) score += 3;
  if (listing.available_from || listing.availability_text) score += 2;
  if (listing.image_url) score += 2;
  if (listing.neighborhood) score += 2;
  if (listing.summary) score += 1;
  score += Math.min((listing.amenities || []).length, 5);
  score += Math.min((listing.transit || []).length, 3);
  score += Number(listing.confidence || 0) * 4;

  return score;
}

function chooseCanonical(listings) {
  return [...listings].sort((a, b) => {
    const scoreDelta = listingScore(b) - listingScore(a);
    if (scoreDelta !== 0) return scoreDelta;
    return new Date(b.decoded_at || b.updated_at || 0) - new Date(a.decoded_at || a.updated_at || 0);
  })[0];
}

function applyDedupeState(listings) {
  const groups = new Map();

  for (const listing of listings) {
    const dedupeKey = buildDedupeKey(listing);
    groups.set(dedupeKey, [...(groups.get(dedupeKey) || []), { ...listing, dedupe_key: dedupeKey }]);
  }

  const updated = [];

  for (const [dedupeKey, group] of groups.entries()) {
    const canonical = chooseCanonical(group);
    const duplicateIds = group
      .map((listing) => listing.id)
      .filter((id) => id !== canonical.id);

    for (const listing of group) {
      updated.push({
        ...listing,
        dedupe_key: dedupeKey,
        canonical_listing_id: canonical.id,
        is_duplicate: listing.id !== canonical.id,
        duplicate_listing_ids: listing.id === canonical.id ? duplicateIds : [],
        duplicate_count: group.length,
      });
    }
  }

  return updated;
}

function visibleListingsOnly(listings) {
  return applyDedupeState(listings).filter((listing) => !listing.is_duplicate);
}

module.exports = {
  applyDedupeState,
  buildDedupeKey,
  visibleListingsOnly,
};
