const brightDataImportService = require("../services/brightDataImportService");
const brightDataApiService = require("../services/brightDataApiService");
const brightDataJobService = require("../services/brightDataJobService");
const groupStatsService = require("../services/groupStatsService");

async function receiveWebhook(req, res, next) {
  try {
    const result = await brightDataImportService.importBrightDataPayload(req.body);

    res.status(202).json({
      ok: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function listTrackedGroups(req, res, next) {
  try {
    res.json({ groups: brightDataApiService.buildInputs() });
  } catch (error) {
    next(error);
  }
}

async function listJobs(req, res, next) {
  try {
    const jobs = await brightDataJobService.listJobs();
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
}

async function listGroupStats(req, res, next) {
  try {
    const groups = await groupStatsService.getGroupStats();
    res.json({ groups });
  } catch (error) {
    next(error);
  }
}

async function triggerSnapshot(req, res, next) {
  try {
    const job = await brightDataJobService.startJob();
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
}

async function getSnapshotStatus(req, res, next) {
  try {
    const job = await brightDataJobService.refreshJobStatus(req.params.snapshotId);
    res.json({ job });
  } catch (error) {
    next(error);
  }
}

async function importSnapshot(req, res, next) {
  try {
    const result = await brightDataJobService.importReadySnapshot(req.params.snapshotId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSnapshotStatus,
  importSnapshot,
  listJobs,
  listGroupStats,
  listTrackedGroups,
  receiveWebhook,
  triggerSnapshot,
};
