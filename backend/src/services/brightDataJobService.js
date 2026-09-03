const brightDataApiService = require("./brightDataApiService");
const brightDataImportService = require("./brightDataImportService");
const brightDataJobModel = require("../models/brightDataJobModel");
const rawPostModel = require("../models/rawPostModel");
const trackedGroupService = require("./trackedGroupService");

async function startJob(options = {}) {
  const triggered = await brightDataApiService.triggerSnapshot(options);
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
  return {
    ...job,
    group_scope: await getJobGroupScope(job),
  };
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
  return {
    ...job,
    group_scope: await getJobGroupScope(job),
  };
}

async function importReadySnapshot(snapshotId) {
  const job = await refreshJobStatus(snapshotId);

  if (job.status !== "ready") {
    const error = new Error(`Snapshot is ${job.status || "not ready"}; import after status is ready`);
    error.status = 409;
    throw error;
  }

  const snapshot = await brightDataApiService.downloadSnapshot(snapshotId);
  const importSummary = await brightDataImportService.importBrightDataPayload(snapshot, {
    snapshotId,
  });
  const importedJob = {
    ...job,
    imported_at: new Date().toISOString(),
    import_summary: importSummary,
    updated_at: new Date().toISOString(),
  };

  await brightDataJobModel.upsertJob(snapshotId, importedJob);

  return {
    job: {
      ...importedJob,
      group_scope: await getJobGroupScope(importedJob),
    },
    import_summary: importSummary,
  };
}

async function listJobs() {
  const jobs = await brightDataJobModel.listJobs();
  const allGroups = await trackedGroupService.listGroups();

  return jobs
    .map((job) => ({
      ...job,
      group_scope: getJobGroupScopeFromCount(job, allGroups.length),
    }))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function getSnapshotDecodeProgress(snapshotId) {
  const job = await brightDataJobModel.getJob(snapshotId);

  if (!job) {
    const error = new Error("Snapshot not found");
    error.status = 404;
    throw error;
  }

  const rawPostIds = Array.from(
    new Set(job.import_summary?.decodeQueuedIds || job.import_summary?.rawPostIds || [])
  );

  if (rawPostIds.length === 0) {
    return {
      snapshot_id: snapshotId,
      available: false,
      total: 0,
      decoded: 0,
      pending: 0,
      failed: 0,
      notListing: 0,
      other: 0,
    };
  }

  const posts = (await rawPostModel.getRawPosts(rawPostIds)).filter(Boolean);
  const progress = {
    snapshot_id: snapshotId,
    available: true,
    total: rawPostIds.length,
    decoded: 0,
    pending: 0,
    failed: 0,
    notListing: 0,
    other: 0,
  };

  for (const post of posts) {
    if (post.decoded_status === "decoded") progress.decoded += 1;
    else if (post.decoded_status === "pending" || post.decoded_status === "decoding") {
      progress.pending += 1;
    } else if (post.decoded_status === "decode_failed") progress.failed += 1;
    else if (post.decoded_status === "not_listing") progress.notListing += 1;
    else progress.other += 1;
  }

  return progress;
}

async function getJobGroupScope(job) {
  const allGroups = await trackedGroupService.listGroups();
  return getJobGroupScopeFromCount(job, allGroups.length);
}

function getJobGroupScopeFromCount(job, totalGroups) {
  const inputs = Array.isArray(job.inputs) ? job.inputs : [];

  if (inputs.length === 0) {
    return "Unknown group";
  }

  if (inputs.length === 1) {
    return inputs[0].name || inputs[0].url || "One group";
  }

  if (totalGroups > 0 && inputs.length === totalGroups) {
    return "All groups";
  }

  return `${inputs.length} groups`;
}

module.exports = {
  getSnapshotDecodeProgress,
  importReadySnapshot,
  listJobs,
  refreshJobStatus,
  startJob,
};
