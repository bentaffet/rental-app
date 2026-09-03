const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "");

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
