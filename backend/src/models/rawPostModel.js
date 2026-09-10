const datastore = require("./datastore");

function getRawPost(id, options) {
  return datastore.getDocument("raw_posts", id, options);
}

async function getRawPosts(ids = []) {
  return Promise.all(ids.map((id) => getRawPost(id)));
}

function upsertRawPost(id, rawPost) {
  return datastore.setDocument("raw_posts", id, rawPost);
}

async function listRawPosts() {
  return datastore.listDocuments("raw_posts");
}

async function listPendingDecode(limit = 10) {
  return datastore.listDocumentsByField("raw_posts", "decoded_status", ["pending", "decode_failed"], limit);
}

function listFailedDecodes() {
  return datastore.listDocumentsByField("raw_posts", "decoded_status", ["decode_failed", "decoding"]);
}

module.exports = {
  getRawPost,
  getRawPosts,
  listPendingDecode,
  listFailedDecodes,
  listRawPosts,
  upsertRawPost,
};
