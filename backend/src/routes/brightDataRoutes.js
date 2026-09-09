const express = require("express");

const brightDataController = require("../controllers/brightDataController");
const verifyBrightDataWebhook = require("../middleware/verifyBrightDataWebhook");
const verifyCronSecret = require("../middleware/verifyCronSecret");

const router = express.Router();

router.get("/groups", brightDataController.listTrackedGroups);
router.post("/groups", brightDataController.addTrackedGroup);
router.post("/groups/add", brightDataController.addTrackedGroup);
router.get("/groups/stats", brightDataController.listGroupStats);
router.get("/groups/timeline", brightDataController.getPostTimeline);
router.get("/jobs", brightDataController.listJobs);
router.post("/trigger", verifyCronSecret, brightDataController.triggerSnapshot);
router.post("/trigger-smart", verifyCronSecret, brightDataController.triggerSmartSnapshot);
router.post("/process-ready", verifyCronSecret, brightDataController.processReadyJobs);
router.get("/snapshots/:snapshotId/status", brightDataController.getSnapshotStatus);
router.get("/snapshots/:snapshotId/decode-progress", brightDataController.getSnapshotDecodeProgress);
router.post("/snapshots/:snapshotId/import", brightDataController.importSnapshot);
router.post("/webhook", verifyBrightDataWebhook, brightDataController.receiveWebhook);

module.exports = router;
