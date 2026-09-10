const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "");
const LISTINGS_CACHE_KEY = "roomup:listings-cache";
const LISTINGS_CACHE_TTL_MS = 5 * 60 * 1000;
let listingsCache = null;
let listingsRequest = null;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Request failed");
  }

  return body;
}

export function getTrackedGroups() {
  return request("/api/brightdata/groups");
}

export function addTrackedGroup(url, numOfPosts = 25) {
  return request("/api/brightdata/groups/add", {
    method: "POST",
    body: JSON.stringify({ url, num_of_posts: numOfPosts }),
  });
}

export function getGroupStats() {
  return request("/api/brightdata/groups/stats");
}

export function getPostTimeline(groupUrl = "") {
  const query = groupUrl ? `?group_url=${encodeURIComponent(groupUrl)}` : "";
  return request(`/api/brightdata/groups/timeline${query}`);
}

export function getListings() {
  const cached = readListingsCache();
  if (cached) return Promise.resolve({ listings: cached.listings });
  if (listingsRequest) return listingsRequest;
  const pending = request("/api/listings").then((result) => {
    if (listingsRequest === pending) cacheListings(result.listings || []);
    return result;
  }).finally(() => {
    if (listingsRequest === pending) listingsRequest = null;
  });
  listingsRequest = pending;
  return pending;
}

export function getListing(listingId) {
  const cached = readListingsCache()?.listings.find((listing) => listing.id === listingId);
  if (cached) return Promise.resolve({ listing: cached });
  return request(`/api/listings/${encodeURIComponent(listingId)}`);
}

function readListingsCache() {
  try {
    listingsCache ||= JSON.parse(window.sessionStorage.getItem(LISTINGS_CACHE_KEY) || "null");
  } catch {
    // Browsing still works when storage is blocked or full.
  }
  if (!Array.isArray(listingsCache?.listings) || !Number.isFinite(listingsCache.cachedAt) ||
      Date.now() - listingsCache.cachedAt >= LISTINGS_CACHE_TTL_MS) return null;
  return listingsCache;
}

export function getCachedListings() {
  return readListingsCache()?.listings || [];
}

export function cacheListings(listings) {
  listingsCache = { cachedAt: Date.now(), listings };
  try {
    window.sessionStorage.setItem(LISTINGS_CACHE_KEY, JSON.stringify(listingsCache));
  } catch {
    // Keep the in-memory cache if browser storage is unavailable.
  }
}

function invalidateListings() {
  listingsCache = null;
  listingsRequest = null;
  try {
    window.sessionStorage.removeItem(LISTINGS_CACHE_KEY);
  } catch {
    // Storage is optional.
  }
}

export function getBrightDataJobs() {
  return request("/api/brightdata/jobs");
}

export function triggerBrightDataSnapshot(urls = null, numOfPosts = 25) {
  const body = { num_of_posts: numOfPosts };

  if (Array.isArray(urls)) {
    body.urls = urls;
  }

  return request("/api/brightdata/trigger", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getBrightDataSnapshotStatus(snapshotId) {
  return request(`/api/brightdata/snapshots/${snapshotId}/status`);
}

export function getSnapshotDecodeProgress(snapshotId) {
  return request(`/api/brightdata/snapshots/${snapshotId}/decode-progress`);
}

export function importBrightDataSnapshot(snapshotId) {
  return request(`/api/brightdata/snapshots/${snapshotId}/import`, {
    method: "POST",
  });
}

export async function decodePendingListings(limit = 5) {
  const result = await request(`/api/openai/decode-pending?limit=${limit}`, {
    method: "POST",
  });
  invalidateListings();
  return result;
}

export function resetFailedDecodes() {
  return request("/api/openai/reset-failed", {
    method: "POST",
  });
}
