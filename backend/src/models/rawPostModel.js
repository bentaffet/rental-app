const datastore = require("./datastore");

function getRawPost(id) {
  return datastore.getDocument("raw_posts", id);
}

function upsertRawPost(id, rawPost) {
  return datastore.setDocument("raw_posts", id, rawPost);
}

async function listRawPosts() {
  return datastore.listDocuments("raw_posts");
}

async function listPendingDecode(limit = 10) {
  const rawPosts = await listRawPosts();

  return rawPosts
    .filter((post) => !["decoded", "not_listing", "decoding"].includes(post.decoded_status))
    .sort((a, b) => new Date(b.date_posted || 0) - new Date(a.date_posted || 0))
    .slice(0, limit);
}

module.exports = {
  getRawPost,
  listPendingDecode,
  listRawPosts,
  upsertRawPost,
};
