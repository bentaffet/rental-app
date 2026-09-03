const datastore = require("./datastore");

function getTrackedGroup(id) {
  return datastore.getDocument("tracked_groups", id);
}

function upsertTrackedGroup(id, group) {
  return datastore.setDocument("tracked_groups", id, group);
}

function listTrackedGroups() {
  return datastore.listDocuments("tracked_groups");
}

module.exports = {
  getTrackedGroup,
  listTrackedGroups,
  upsertTrackedGroup,
};
