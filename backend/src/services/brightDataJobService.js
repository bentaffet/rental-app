const brightDataApiService = require("./brightDataApiService");
const brightDataImportService = require("./brightDataImportService");
const brightDataJobModel = require("../models/brightDataJobModel");

async function startJob() {
  const triggered = await brightDataApiService.triggerSnapshot();
  const now = new Date().toISOString();

  const job = {
    id: triggered.snapshot_id,
    snapshot_id: triggered.snapshot_id,
    status: "starting",
    inputs: triggered.inputs,
    trigger_response: triggered.raw,
    created_at: now,
    updated_at: now,
    import_summary: null,
  };

  await brightDataJobModel.upsertJob(triggered.snapshot_id, job);
  return job;
}

async function refreshJobStatus(snapshotId) {
  const progress = await brightDataApiService.getSnapshotProgress(snapshotId);
  const existing = (await brightDataJobModel.getJob(snapshotId)) || {
    id: snapshotId,
    snapshot_id: snapshotId,
    created_at: new Date().toISOString(),
  };

  const job = {
    ...existing,
    status: progress.status || existing.status,
    progress_response: progress,
    updated_at: new Date().toISOString(),
  };

  await brightDataJobModel.upsertJob(snapshotId, job);
  return job;
}

async function importReadySnapshot(snapshotId) {
  const job = await refreshJobStatus(snapshotId);

  if (job.status !== "ready") {
    const error = new Error(`Snapshot is ${job.status || "not ready"}; import after status is ready`);
    error.status = 409;
    throw error;
  }

  const snapshot = await brightDataApiService.downloadSnapshot(snapshotId);
  const importSummary = await brightDataImportService.importBrightDataPayload(snapshot);
  const importedJob = {
    ...job,
    imported_at: new Date().toISOString(),
    import_summary: importSummary,
    updated_at: new Date().toISOString(),
  };

  await brightDataJobModel.upsertJob(snapshotId, importedJob);

  return {
    job: importedJob,
    import_summary: importSummary,
  };
}

async function listJobs() {
  const jobs = await brightDataJobModel.listJobs();
  return jobs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

module.exports = {
  importReadySnapshot,
  listJobs,
  refreshJobStatus,
  startJob,
};
