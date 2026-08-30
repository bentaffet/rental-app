const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STALE_AFTER_DAYS = 14;
const ARCHIVE_AFTER_DAYS = 30;

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateOnly(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ageInDays(date, now) {
  return Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY);
}

function getListingLifecycle(listing, now = new Date()) {
  const postedAt = parseDate(listing.date_posted || listing.postedAt);
  const availableUntil = parseDateOnly(listing.available_until || listing.availableUntil);
  const existingArchivedAt = listing.archived_at || null;

  if (availableUntil && availableUntil < now) {
    return {
      listing_status: "archived",
      lifecycle_reason: "availability ended",
      archived_at: existingArchivedAt || now.toISOString(),
    };
  }

  if (postedAt) {
    const daysOld = ageInDays(postedAt, now);

    if (daysOld >= ARCHIVE_AFTER_DAYS) {
      return {
        listing_status: "archived",
        lifecycle_reason: `posted ${daysOld} days ago`,
        archived_at: existingArchivedAt || now.toISOString(),
      };
    }

    if (daysOld >= STALE_AFTER_DAYS) {
      return {
        listing_status: "stale",
        lifecycle_reason: `posted ${daysOld} days ago`,
        archived_at: null,
      };
    }
  }

  return {
    listing_status: "active",
    lifecycle_reason: null,
    archived_at: null,
  };
}

function applyListingLifecycle(listing, now = new Date()) {
  return {
    ...listing,
    ...getListingLifecycle(listing, now),
    lifecycle_checked_at: now.toISOString(),
  };
}

function visibleByLifecycle(listings, options = {}) {
  const includeStale = options.includeStale === true;
  const includeArchived = options.includeArchived === true;

  return listings
    .map((listing) => applyListingLifecycle(listing))
    .filter((listing) => {
      if (listing.listing_status === "archived") {
        return includeArchived;
      }

      if (listing.listing_status === "stale") {
        return includeStale || includeArchived;
      }

      return true;
    });
}

module.exports = {
  ARCHIVE_AFTER_DAYS,
  STALE_AFTER_DAYS,
  applyListingLifecycle,
  getListingLifecycle,
  visibleByLifecycle,
};
