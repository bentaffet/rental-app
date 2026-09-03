const crypto = require("crypto");

const defaultGroups = require("../../data/groups.example.json");
const trackedGroupModel = require("../models/trackedGroupModel");

const DEFAULT_POST_COUNT = 25;

function normalizeFacebookGroupUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    const error = new Error("Paste a Facebook group link");
    error.status = 400;
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch (error) {
    const invalid = new Error("Use a valid Facebook group link");
    invalid.status = 400;
    throw invalid;
  }

  const host = parsed.hostname.replace(/^www\./, "");
  const parts = parsed.pathname.split("/").filter(Boolean);
  const groupIndex = parts.findIndex((part) => part.toLowerCase() === "groups");
  const groupSlug = groupIndex >= 0 ? parts[groupIndex + 1] : null;

  if (host !== "facebook.com" || !groupSlug) {
    const error = new Error("Use a Facebook group link like https://www.facebook.com/groups/example");
    error.status = 400;
    throw error;
  }

  return `https://www.facebook.com/groups/${groupSlug}/`;
}

function normalizeComparableUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function buildGroupId(url) {
  return crypto.createHash("sha256").update(normalizeComparableUrl(url)).digest("hex").slice(0, 24);
}

function parsePostCount(value, fallback = DEFAULT_POST_COUNT) {
  const count = Number(value || fallback);
  return Number.isFinite(count) ? Math.min(Math.max(Math.round(count), 1), 100) : fallback;
}

function isQuotaError(error) {
  return (
    error?.code === 8 ||
    error?.status === 429 ||
    /RESOURCE_EXHAUSTED/i.test(String(error?.message || "")) ||
    /quota/i.test(String(error?.message || ""))
  );
}

function toTrackedGroup(group, postCountOverride) {
  const postCount = parsePostCount(postCountOverride, group.num_of_posts || DEFAULT_POST_COUNT);

  return {
    ...group,
    url: normalizeFacebookGroupUrl(group.url),
    num_of_posts: postCount,
    user_to_not_include: group.user_to_not_include || "",
    start_date: group.start_date || "",
    end_date: group.end_date || "",
  };
}

function toBrightDataInput(group, postCountOverride) {
  const trackedGroup = toTrackedGroup(group, postCountOverride);

  return {
    url: trackedGroup.url,
    num_of_posts: trackedGroup.num_of_posts,
    user_to_not_include: trackedGroup.user_to_not_include,
    start_date: trackedGroup.start_date,
    end_date: trackedGroup.end_date,
  };
}

async function listGroups() {
  let customGroups = [];

  try {
    customGroups = await trackedGroupModel.listTrackedGroups();
  } catch (error) {
    if (!isQuotaError(error)) {
      throw error;
    }
  }

  const groupsByUrl = new Map();

  for (const group of [...defaultGroups, ...customGroups]) {
    const input = toTrackedGroup(group);
    groupsByUrl.set(normalizeComparableUrl(input.url), input);
  }

  return Array.from(groupsByUrl.values()).sort((a, b) =>
    normalizeComparableUrl(a.url).localeCompare(normalizeComparableUrl(b.url))
  );
}

async function addGroup(options = {}) {
  const url = normalizeFacebookGroupUrl(options.url);
  const now = new Date().toISOString();
  const id = buildGroupId(url);
  const existing = await trackedGroupModel.getTrackedGroup(id);

  if (existing) {
    return {
      ...toTrackedGroup(existing),
      already_tracked: true,
    };
  }

  const defaultMatch = defaultGroups.find(
    (group) => normalizeComparableUrl(toTrackedGroup(group).url) === normalizeComparableUrl(url)
  );

  if (defaultMatch) {
    return {
      ...toTrackedGroup(defaultMatch),
      already_tracked: true,
    };
  }

  const group = {
    id,
    name: options.name || `Facebook group ${url.split("/").filter(Boolean).at(-1)}`,
    url,
    num_of_posts: parsePostCount(options.num_of_posts, DEFAULT_POST_COUNT),
    user_to_not_include: "",
    start_date: "",
    end_date: "",
    created_at: now,
    updated_at: now,
  };

  await trackedGroupModel.upsertTrackedGroup(id, group);
  return toTrackedGroup(group);
}

async function buildInputs(options = {}) {
  const urls = Array.isArray(options.urls) ? options.urls.filter(Boolean) : [];
  const selectedUrls = urls.length > 0
    ? new Set(urls.map(normalizeComparableUrl))
    : null;
  const groups = await listGroups();
  const selectedGroups = selectedUrls
    ? groups.filter((group) => selectedUrls.has(normalizeComparableUrl(group.url)))
    : groups;

  if (selectedUrls && selectedGroups.length === 0) {
    const error = new Error("No matching tracked groups selected");
    error.status = 400;
    throw error;
  }

  return selectedGroups.map((group) => toBrightDataInput(group, options.num_of_posts));
}

module.exports = {
  addGroup,
  buildInputs,
  isQuotaError,
  listGroups,
  normalizeComparableUrl,
  normalizeFacebookGroupUrl,
  parsePostCount,
};
