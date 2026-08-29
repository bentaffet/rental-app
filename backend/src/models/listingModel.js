const datastore = require("./datastore");

function getListing(id) {
  return datastore.getDocument("listings", id);
}

function deleteListing(id) {
  return datastore.deleteDocument("listings", id);
}

function upsertListing(id, listing) {
  return datastore.setDocument("listings", id, listing);
}

function listListings() {
  return datastore.listDocuments("listings");
}

module.exports = {
  deleteListing,
  getListing,
  upsertListing,
  listListings,
};
