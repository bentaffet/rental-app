const express = require("express");

const brightDataController = require("../controllers/brightDataController");
const verifyBrightDataWebhook = require("../middleware/verifyBrightDataWebhook");

const router = express.Router();

router.get("/groups", brightDataController.listTrackedGroups);
router.get("/groups/stats", brightDataController.listGroupStats);
router.get("/jobs", brightDataController.listJobs);
router.post("/trigger", brightDataController.triggerSnapshot);
router.get("/snapshots/:snapshotId/status", brightDataController.getSnapshotStatus);
router.post("/snapshots/:snapshotId/import", brightDataController.importSnapshot);
router.post("/webhook", verifyBrightDataWebhook, brightDataController.receiveWebhook);

module.exports = router;
