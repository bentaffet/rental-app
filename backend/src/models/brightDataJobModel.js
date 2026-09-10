const datastore = require("./datastore");

function getJob(snapshotId, options) {
  return datastore.getDocument("brightdata_jobs", snapshotId, options);
}

function upsertJob(snapshotId, job) {
  return datastore.setDocument("brightdata_jobs", snapshotId, job);
}

function listJobs() {
  return datastore.listDocuments("brightdata_jobs");
}

module.exports = {
  getJob,
  upsertJob,
  listJobs,
};
