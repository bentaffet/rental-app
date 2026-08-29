const rawPostModel = require("../models/rawPostModel");
const brightDataApiService = require("./brightDataApiService");

function emptyStats(group) {
  return {
    url: group.url,
    requested_posts: group.num_of_posts,
    raw_posts: 0,
    decoded: 0,
    pending: 0,
    decoding: 0,
    failed: 0,
    not_listing: 0,
    other: 0,
  };
}

function getGroupKey(post) {
  return post.group_url || post.raw_payload?.input?.url || null;
}

function countStatus(stats, status) {
  if (status === "decoded") stats.decoded += 1;
  else if (status === "pending") stats.pending += 1;
  else if (status === "decoding") stats.decoding += 1;
  else if (status === "decode_failed") stats.failed += 1;
  else if (status === "not_listing") stats.not_listing += 1;
  else stats.other += 1;
}

async function getGroupStats() {
  const groups = brightDataApiService.buildInputs();
  const statsByUrl = new Map(groups.map((group) => [group.url, emptyStats(group)]));
  const rawPosts = await rawPostModel.listRawPosts();

  for (const post of rawPosts) {
    const groupUrl = getGroupKey(post);
    const stats = statsByUrl.get(groupUrl);

    if (!stats) {
      continue;
    }

    stats.raw_posts += 1;
    countStatus(stats, post.decoded_status);
  }

  return Array.from(statsByUrl.values());
}

module.exports = {
  getGroupStats,
};
