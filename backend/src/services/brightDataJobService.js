const brightDataApiService = require("./brightDataApiService");
const brightDataImportService = require("./brightDataImportService");
const brightDataJobModel = require("../models/brightDataJobModel");
const rawPostModel = require("../models/rawPostModel");
const brightDataSmartScheduleService = require("./brightDataSmartScheduleService");
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
    smart_schedule: options.smartSchedule || null,
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

async function startSmartScheduledJobs(options = {}) {
  const schedule = brightDataSmartScheduleService.buildSchedule(options.now);
  const jobs = [];
  const failed = [];

  for (const batch of schedule.batches) {
    try {
      const job = await startJob({
        groupInputs: batch.groups,
        smartSchedule: {
          label: batch.label,
          reason: batch.reason,
          cadence: batch.cadence,
          timezone: schedule.timezone,
          hour: schedule.hour,
          weekday: schedule.weekday,
        },
      });

      jobs.push({
        label: batch.label,
        reason: batch.reason,
        cadence: batch.cadence,
        job,
      });
    } catch (error) {
      failed.push({
        label: batch.label,
        reason: batch.reason,
        cadence: batch.cadence,
        error: error.message,
      });
    }
  }

  if (jobs.length === 0 && failed.length > 0) {
    const error = new Error("No smart scheduled snapshots could be started");
    error.status = 502;
    error.details = failed;
    throw error;
  }

  return {
    triggered: jobs.length,
    failed: failed.length,
    timezone: schedule.timezone,
    hour: schedule.hour,
    weekday: schedule.weekday,
    jobs,
    failures: failed,
  };
}

async function refreshJobStatus(snapshotId) {
  const progress = await brightDataApiService.getSnapshotProgress(snapshotId);
  const existing = (await brightDataJobModel.getJob(snapshotId, { fresh: true })) || {
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

async function processReadyJobs(options = {}) {
  const jobs = await listJobs();
  const jobLimit = Math.min(Math.max(Number(options.jobLimit || 1), 0), 10);
  const openJobs = jobs.filter((job) => {
    if (!job.snapshot_id || job.imported_at || job.import_summary) return false;
    return ["starting", "running", "ready"].includes(job.status);
  }).slice(0, jobLimit);
  const processed = [];

  for (const job of openJobs) {
    const refreshed = await refreshJobStatus(job.snapshot_id);

    if (refreshed.status !== "ready") {
      processed.push({
        snapshot_id: refreshed.snapshot_id,
        status: refreshed.status,
        imported: false,
      });
      continue;
    }

    try {
      const imported = await importReadySnapshot(refreshed.snapshot_id);
      processed.push({
        snapshot_id: refreshed.snapshot_id,
        status: "ready",
        imported: true,
        import_summary: imported.import_summary,
      });
    } catch (error) {
      processed.push({
        snapshot_id: refreshed.snapshot_id,
        status: refreshed.status,
        imported: false,
        error: error.message,
      });
    }
  }

  const decodeBatches = Math.min(Math.max(Number(options.decodeBatches || 1), 1), 10);
  const decodeResults = [];

  if (options.decodePending) {
    for (let batch = 0; batch < decodeBatches; batch++) {
      const decodeResult = await options.decodePending({ limit: options.decodeLimit });
      decodeResults.push(decodeResult);

      if (decodeResult.found === 0 || decodeResult.quotaExhausted) {
        break;
      }
    }
  }

  return {
    totalJobs: jobs.length,
    checked: openJobs.length,
    remainingOpenJobs: jobs.filter((job) => {
      if (!job.snapshot_id || job.imported_at || job.import_summary) return false;
      return ["starting", "running", "ready"].includes(job.status);
    }).length - openJobs.length,
    imported: processed.filter((job) => job.imported).length,
    recentJobs: jobs.slice(0, 10).map((job) => ({
      snapshot_id: job.snapshot_id,
      status: job.status,
      imported: Boolean(job.imported_at || job.import_summary),
      created_at: job.created_at,
      updated_at: job.updated_at,
      group_scope: job.group_scope,
    })),
    processed,
    decode: {
      batches: decodeResults.length,
      requested: decodeResults.reduce((sum, result) => sum + result.requested, 0),
      found: decodeResults.reduce((sum, result) => sum + result.found, 0),
      decoded: decodeResults.reduce((sum, result) => sum + result.decoded, 0),
      notListing: decodeResults.reduce((sum, result) => sum + result.notListing, 0),
      failed: decodeResults.reduce((sum, result) => sum + result.failed, 0),
      quotaExhausted: decodeResults.some((result) => result.quotaExhausted),
      results: decodeResults,
    },
  };
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
  processReadyJobs,
  refreshJobStatus,
  startSmartScheduledJobs,
  startJob,
};
