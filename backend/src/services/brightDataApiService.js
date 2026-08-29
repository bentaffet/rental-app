const trackedGroups = require("../../data/groups.example.json");

const DEFAULT_API_BASE_URL = "https://api.brightdata.com/datasets/v3";

function getConfig() {
  return {
    apiKey: process.env.BRIGHTDATA_API_KEY,
    datasetId: process.env.BRIGHTDATA_DATASET_ID,
    baseUrl: process.env.BRIGHTDATA_API_BASE_URL || DEFAULT_API_BASE_URL,
  };
}

function ensureBrightDataConfig() {
  const config = getConfig();

  if (!config.apiKey) {
    const error = new Error("Missing BRIGHTDATA_API_KEY");
    error.status = 400;
    throw error;
  }

  if (!config.datasetId) {
    const error = new Error("Missing BRIGHTDATA_DATASET_ID");
    error.status = 400;
    throw error;
  }

  return config;
}

function buildInputs() {
  return trackedGroups.map((group) => ({
    url: group.url,
    user_to_not_include: group.user_to_not_include || "",
    num_of_posts: group.num_of_posts || 25,
    start_date: group.start_date || "",
    end_date: group.end_date || "",
  }));
}

async function brightDataFetch(path, options = {}) {
  const config = ensureBrightDataConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") && text ? JSON.parse(text) : text;

  if (!response.ok) {
    const error = new Error(body?.error || body?.message || "Bright Data request failed");
    error.status = response.status;
    error.details = body;
    throw error;
  }

  return body;
}

async function triggerSnapshot() {
  const config = ensureBrightDataConfig();
  const params = new URLSearchParams({
    dataset_id: config.datasetId,
    include_errors: "true",
    format: "json",
  });

  const body = await brightDataFetch(`/trigger?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify(buildInputs()),
  });

  return {
    snapshot_id: body.snapshot_id,
    raw: body,
    inputs: buildInputs(),
  };
}

async function getSnapshotProgress(snapshotId) {
  return brightDataFetch(`/progress/${encodeURIComponent(snapshotId)}`, {
    method: "GET",
  });
}

async function downloadSnapshot(snapshotId) {
  const params = new URLSearchParams({ format: "json" });
  return brightDataFetch(`/snapshot/${encodeURIComponent(snapshotId)}?${params.toString()}`, {
    method: "GET",
  });
}

module.exports = {
  buildInputs,
  downloadSnapshot,
  getSnapshotProgress,
  triggerSnapshot,
};
