function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePrice(value) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const input = text(value);
  // Accept a single amount, not ranges, deposits, weekly rates, or prose.
  if (!/^(?:\$\s*)?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(input)) return null;
  const number = Number(input.replace(/[$,\s]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function getScrapedMetadata(rawPost) {
  const payload = rawPost.raw_payload || {};
  return {
    price: parsePrice(payload.price),
    location: text(payload.location) || null,
    property_title: text(payload.post_external_title) || null,
  };
}

function missing(value) {
  return value == null || value === "" || /^unknown(?: location)?$/i.test(String(value));
}

function applyScrapedMetadata(rawPost, listing) {
  const metadata = getScrapedMetadata(rawPost);
  const next = { ...listing };
  if (missing(next.price) && metadata.price !== null) next.price = metadata.price;

  // Existing interpreted locations may be more precise than a marketplace label.
  // Only supply a fallback when there is no interpreted place at all.
  if (metadata.location && [next.neighborhood, next.borough, next.city].every(missing)) {
    const ozone = /^(South Ozone Park|Ozone Park),\s*(?:NY|New York)$/i.exec(metadata.location);
    if (ozone && (missing(next.state) || next.state === "NY")) {
      // https://www.nyc.gov/site/nypd/bureaus/patrol/precincts/106th-precinct.page
      next.neighborhood = /^south/i.test(ozone[1]) ? "South Ozone Park" : "Ozone Park";
      next.borough = "Queens";
      next.city = "New York";
      next.state = "NY";
    } else {
      // Preserve the source label without guessing which city/neighborhood it is.
      next.neighborhood = metadata.location;
    }
  }
  return next;
}

module.exports = { applyScrapedMetadata, getScrapedMetadata, parsePrice };
