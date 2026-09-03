const brightDataImportService = require("../services/brightDataImportService");
const brightDataJobService = require("../services/brightDataJobService");
const groupStatsService = require("../services/groupStatsService");
const trackedGroupService = require("../services/trackedGroupService");

function emptyTimeline() {
  return {
    total_posts: 0,
    dated_posts: 0,
    missing_dates: 0,
    missing_times: 0,
    bucket_hours: 1,
    first_posted_at: null,
    latest_posted_at: null,
    buckets: [],
  };
}

function emptyGroupStats(group) {
  return {
    url: group.url,
    requested_posts: group.num_of_posts,
    group_name: null,
    group_id: null,
    raw_posts: 0,
    decoded: 0,
    pending: 0,
    decoding: 0,
    failed: 0,
    not_listing: 0,
    other: 0,
    first_posted_at: null,
    latest_posted_at: null,
    latest_imported_at: null,
    missing_dates: 0,
    missing_times: 0,
  };
}

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
    res.json({ groups: await trackedGroupService.listGroups() });
  } catch (error) {
    if (trackedGroupService.isQuotaError(error)) {
      res.json({
        groups: await trackedGroupService.listGroups(),
        quota_exhausted: true,
        message: "Firestore quota is exhausted; custom tracked groups may be temporarily hidden.",
      });
      return;
    }

    next(error);
  }
}

async function addTrackedGroup(req, res, next) {
  try {
    const group = await trackedGroupService.addGroup({
      url: req.body?.url,
      num_of_posts: req.body?.num_of_posts,
    });
    res.status(201).json({ group });
  } catch (error) {
    next(error);
  }
}

async function listJobs(req, res, next) {
  try {
    const jobs = await brightDataJobService.listJobs();
    res.json({ jobs });
  } catch (error) {
    if (trackedGroupService.isQuotaError(error)) {
      res.json({
        jobs: [],
        quota_exhausted: true,
        message: "Firestore quota is exhausted; snapshots cannot be loaded right now.",
      });
      return;
    }

    next(error);
  }
}

async function listGroupStats(req, res, next) {
  try {
    const groups = await groupStatsService.getGroupStats();
    res.json({ groups });
  } catch (error) {
    if (trackedGroupService.isQuotaError(error)) {
      const groups = await trackedGroupService.listGroups();
      res.json({
        groups: groups.map(emptyGroupStats),
        quota_exhausted: true,
        message: "Firestore quota is exhausted; group stats cannot be loaded right now.",
      });
      return;
    }

    next(error);
  }
}

async function getPostTimeline(req, res, next) {
  try {
    const timeline = await groupStatsService.getPostTimeline({
      groupUrl: req.query.group_url || null,
    });
    res.json({ timeline });
  } catch (error) {
    if (trackedGroupService.isQuotaError(error)) {
      res.json({
        timeline: emptyTimeline(),
        quota_exhausted: true,
        message: "Firestore quota is exhausted; try loading the timeline again later.",
      });
      return;
    }

    next(error);
  }
}

async function triggerSnapshot(req, res, next) {
  try {
    const job = await brightDataJobService.startJob({
      urls: req.body?.urls,
      num_of_posts: req.body?.num_of_posts,
    });
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

async function getSnapshotDecodeProgress(req, res, next) {
  try {
    const progress = await brightDataJobService.getSnapshotDecodeProgress(req.params.snapshotId);
    res.json({ progress });
  } catch (error) {
    if (trackedGroupService.isQuotaError(error)) {
      res.json({
        progress: {
          snapshot_id: req.params.snapshotId,
          available: false,
          total: 0,
          decoded: 0,
          pending: 0,
          failed: 0,
          notListing: 0,
          other: 0,
        },
        quota_exhausted: true,
        message: "Firestore quota is exhausted; snapshot decode progress cannot be loaded right now.",
      });
      return;
    }

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
  getPostTimeline,
  getSnapshotStatus,
  getSnapshotDecodeProgress,
  importSnapshot,
  addTrackedGroup,
  listJobs,
  listGroupStats,
  listTrackedGroups,
  receiveWebhook,
  triggerSnapshot,
};
