const rawPostModel = require("../models/rawPostModel");
const brightDataApiService = require("./brightDataApiService");

function emptyStats(group) {
  return {
    url: group.url,
    requested_posts: group.num_of_posts,
    group_name: null,
    group_id: null,
    raw_posts: 0,
    decoded: 0,
    pending: 0,
    decoding: 0,
    failed: 0,
    not_listing: 0,
    other: 0,
    first_posted_at: null,
    latest_posted_at: null,
    latest_imported_at: null,
    missing_dates: 0,
    missing_times: 0,
  };
}

function normalizeGroupUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getGroupKey(post) {
  const value = post.group_url || post.raw_payload?.input?.url || null;
  return value ? normalizeGroupUrl(value) : null;
}

function countStatus(stats, status) {
  if (status === "decoded") stats.decoded += 1;
  else if (status === "pending") stats.pending += 1;
  else if (status === "decoding") stats.decoding += 1;
  else if (status === "decode_failed") stats.failed += 1;
  else if (status === "not_listing") stats.not_listing += 1;
  else stats.other += 1;
}

function parsePostedDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasTime(value) {
  return /T\d{2}:\d{2}/.test(String(value || ""));
}

function newerDate(current, candidate) {
  if (!candidate) {
    return current;
  }

  if (!current || new Date(candidate) > new Date(current)) {
    return candidate;
  }

  return current;
}

function olderDate(current, candidate) {
  if (!candidate) {
    return current;
  }

  if (!current || new Date(candidate) < new Date(current)) {
    return candidate;
  }

  return current;
}

function updateDateStats(stats, post) {
  const postedDate = parsePostedDate(post.date_posted);

  if (!postedDate) {
    stats.missing_dates += 1;
  } else {
    stats.first_posted_at = olderDate(stats.first_posted_at, post.date_posted);
    stats.latest_posted_at = newerDate(stats.latest_posted_at, post.date_posted);

    if (!hasTime(post.date_posted)) {
      stats.missing_times += 1;
    }
  }

  stats.latest_imported_at = newerDate(stats.latest_imported_at, post.imported_at);
}

function roundDownToBucket(date, bucketMs) {
  return new Date(Math.floor(date.getTime() / bucketMs) * bucketMs);
}

function chooseBucketHours(startDate, endDate) {
  return 1;
}

function matchesGroupUrl(post, groupUrl) {
  return !groupUrl || getGroupKey(post) === normalizeGroupUrl(groupUrl);
}

async function getGroupStats() {
  const groups = await brightDataApiService.buildInputs();
  const statsByUrl = new Map(
    groups.map((group) => [normalizeGroupUrl(group.url), emptyStats(group)])
  );
  const rawPosts = await rawPostModel.listRawPosts();

  for (const post of rawPosts) {
    const groupUrl = getGroupKey(post);
    const stats = statsByUrl.get(groupUrl);

    if (!stats) {
      continue;
    }

    stats.raw_posts += 1;
    stats.group_name = stats.group_name || post.group_name || null;
    stats.group_id = stats.group_id || post.group_id || null;
    countStatus(stats, post.decoded_status);
    updateDateStats(stats, post);
  }

  return Array.from(statsByUrl.values());
}

async function getPostTimeline(options = {}) {
  const rawPosts = (await rawPostModel.listRawPosts()).filter((post) =>
    matchesGroupUrl(post, options.groupUrl)
  );
  const datedPosts = rawPosts
    .map((post) => ({
      ...post,
      parsedDate: parsePostedDate(post.date_posted),
    }))
    .filter((post) => post.parsedDate)
    .sort((a, b) => a.parsedDate - b.parsedDate);
  const missingDates = rawPosts.length - datedPosts.length;

  if (datedPosts.length === 0) {
    return {
      total_posts: rawPosts.length,
      dated_posts: 0,
      missing_dates: missingDates,
      missing_times: 0,
      bucket_hours: 6,
      first_posted_at: null,
      latest_posted_at: null,
      buckets: [],
    };
  }

  const startDate = datedPosts[0].parsedDate;
  const endDate = datedPosts[datedPosts.length - 1].parsedDate;
  const bucketHours = chooseBucketHours(startDate, endDate);
  const bucketMs = bucketHours * 60 * 60 * 1000;
  const startBucket = roundDownToBucket(startDate, bucketMs);
  const endBucket = roundDownToBucket(endDate, bucketMs);
  const bucketMap = new Map();

  for (
    let cursor = startBucket.getTime();
    cursor <= endBucket.getTime();
    cursor += bucketMs
  ) {
    bucketMap.set(new Date(cursor).toISOString(), {
      start: new Date(cursor).toISOString(),
      count: 0,
      groups: {},
    });
  }

  for (const post of datedPosts) {
    const bucketKey = roundDownToBucket(post.parsedDate, bucketMs).toISOString();
    const bucket = bucketMap.get(bucketKey);

    if (!bucket) {
      continue;
    }

    bucket.count += 1;
    bucket.groups[post.group_url || post.group_id || "unknown"] =
      (bucket.groups[post.group_url || post.group_id || "unknown"] || 0) + 1;
  }

  return {
    total_posts: rawPosts.length,
    dated_posts: datedPosts.length,
    missing_dates: missingDates,
    missing_times: datedPosts.filter((post) => !hasTime(post.date_posted)).length,
    bucket_hours: bucketHours,
    first_posted_at: startDate.toISOString(),
    latest_posted_at: endDate.toISOString(),
    buckets: Array.from(bucketMap.values()),
  };
}

module.exports = {
  getGroupStats,
  getPostTimeline,
};
