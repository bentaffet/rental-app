export function filterListings(listings, filters) {
  const filtered = listings.filter((listing) => {
    const matchesBorough =
      filters.borough === "All" || listing.borough === filters.borough;
    const matchesPrice = !listing.price || listing.price <= filters.maxPrice;
    const matchesStart = matchesDateFilter(
      listing.availableFrom || listing.available_from,
      filters.startDate,
      filters.startMonthOnly
    );
    const matchesEnd = matchesDateFilter(
      listing.availableUntil || listing.available_until,
      filters.endDate,
      filters.endMonthOnly
    );
    const matchesPostedAge = matchesPostedWithinDays(
      listing.postedAt || listing.date_posted,
      filters.postedWithinDays
    );

    return (
      matchesBorough &&
      matchesPrice &&
      matchesStart &&
      matchesEnd &&
      matchesPostedAge
    );
  });

  return sortListings(filtered, filters.sortBy);
}

function matchesPostedWithinDays(value, filterValue) {
  const days = Number(filterValue);
  if (!days) return true;
  if (!value) return false;

  const postedTime = new Date(value).getTime();
  if (Number.isNaN(postedTime)) return false;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return postedTime >= cutoff;
}

function matchesDateFilter(value, filterValue, monthOnly) {
  if (!filterValue) {
    return true;
  }

  if (!value) {
    return false;
  }

  if (monthOnly) {
    return value.slice(0, 7) === filterValue.slice(0, 7);
  }

  return value === filterValue;
}

function sortListings(listings, sortBy) {
  if (sortBy === "price_asc") {
    return [...listings].sort((a, b) => priceValue(a) - priceValue(b));
  }

  if (sortBy === "price_desc") {
    return [...listings].sort((a, b) => priceValue(b) - priceValue(a));
  }

  if (sortBy === "posted_desc") {
    return [...listings].sort((a, b) => postedValue(b) - postedValue(a));
  }

  return listings;
}

function priceValue(listing) {
  return Number.isFinite(listing.price) ? listing.price : Number.POSITIVE_INFINITY;
}

function postedValue(listing) {
  return new Date(listing.postedAt || listing.date_posted || 0).getTime();
}
