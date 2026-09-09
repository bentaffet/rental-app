const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "");
const LISTINGS_CACHE_KEY = "roomup:listings-cache";
const LISTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

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
  return request("/api/listings");
}

export function getListing(listingId) {
  return request(`/api/listings/${encodeURIComponent(listingId)}`);
}

export function getCachedListings() {
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(LISTINGS_CACHE_KEY) || "null");
    if (!cached?.listings || Date.now() - cached.cachedAt > LISTINGS_CACHE_TTL_MS) {
      return [];
    }
    return cached.listings;
  } catch {
    return [];
  }
}

export function cacheListings(listings) {
  window.sessionStorage.setItem(
    LISTINGS_CACHE_KEY,
    JSON.stringify({
      cachedAt: Date.now(),
      listings,
    })
  );
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

export function decodePendingListings(limit = 5) {
  return request(`/api/openai/decode-pending?limit=${limit}`, {
    method: "POST",
  });
}

export function resetFailedDecodes() {
  return request("/api/openai/reset-failed", {
    method: "POST",
  });
}
