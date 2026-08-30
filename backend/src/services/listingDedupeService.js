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

function normalizeImageIdentity(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const filename = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "")
      .toLowerCase()
      .replace(/\.(?:avif|gif|jpe?g|png|webp)$/i, "");

    // Facebook changes CDN hostnames and delivery parameters for the same media asset.
    if (
      filename &&
      (hostname.endsWith("fbcdn.net") || hostname.endsWith("cdninstagram.com"))
    ) {
      return `meta-media:${filename}`;
    }

    return `${hostname}${url.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return normalizeText(value);
  }
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

function textLocationKey(listing) {
  const text = normalizeText([listing.title, listing.summary].filter(Boolean).join(" "));

  if (/\bhoboken\b/.test(text)) {
    return "hoboken";
  }

  return "";
}

function locationKey(listing) {
  const primaryLocation = [listing.neighborhood, listing.borough, listing.city]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
  const locationText = primaryLocation || textLocationKey(listing);

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

function buildImageDedupeKeys(listing) {
  const imageUrls = [listing.image_url, ...(listing.image_urls || [])].filter(Boolean);

  return Array.from(new Set(imageUrls.map(normalizeImageIdentity).filter(Boolean))).map(
    (imageIdentity) => `image__${imageIdentity}`
  );
}

function buildVisualDedupeKeys(listing) {
  return Array.from(new Set((listing.image_hashes || []).filter(Boolean))).map(
    (imageHash) => `visual__${imageHash}`
  );
}

function buildDedupeKeys(listing) {
  return [
    buildDedupeKey(listing),
    ...buildImageDedupeKeys(listing),
    ...buildVisualDedupeKeys(listing),
  ].filter(Boolean);
}

function listingScore(listing) {
  let score = 0;

  if (listing.price) score += 3;
  if (listing.available_from || listing.availability_text) score += 2;
  if (listing.image_url) score += 2;
  if (listing.neighborhood) score += 2;
  if (listing.summary) score += 1;
  score += Math.min((listing.amenities || []).length, 5);

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
  const parent = new Map();
  const groups = new Map();

  function find(id) {
    const currentParent = parent.get(id) || id;

    if (currentParent === id) {
      return id;
    }

    const root = find(currentParent);
    parent.set(id, root);
    return root;
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);

    if (rootA !== rootB) {
      parent.set(rootB, rootA);
    }
  }

  for (const listing of listings) {
    parent.set(listing.id, listing.id);
  }

  for (const listing of listings) {
    for (const dedupeKey of buildDedupeKeys(listing)) {
      const matchingListingId = groups.get(dedupeKey);

      if (matchingListingId) {
        union(matchingListingId, listing.id);
      } else {
        groups.set(dedupeKey, listing.id);
      }
    }
  }

  const groupedListings = new Map();

  for (const listing of listings) {
    const root = find(listing.id);
    const dedupeKey = buildDedupeKey(listing);
    groupedListings.set(root, [
      ...(groupedListings.get(root) || []),
      { ...listing, dedupe_key: dedupeKey },
    ]);
  }

  const updated = [];

  for (const group of groupedListings.values()) {
    const canonical = chooseCanonical(group);
    const duplicateIds = group
      .map((listing) => listing.id)
      .filter((id) => id !== canonical.id);

    for (const listing of group) {
      updated.push({
        ...listing,
        dedupe_key: canonical.dedupe_key,
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
  const persistedCanonicalListings = listings.filter((listing) => !listing.is_duplicate);
  return applyDedupeState(persistedCanonicalListings).filter((listing) => !listing.is_duplicate);
}

module.exports = {
  applyDedupeState,
  buildDedupeKey,
  visibleListingsOnly,
};
