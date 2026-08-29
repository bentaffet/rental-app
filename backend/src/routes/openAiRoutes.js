const express = require("express");

const openAiController = require("../controllers/openAiController");

const router = express.Router();

router.post("/decode-pending", openAiController.decodePending);
router.post("/decode/:id", openAiController.decodeOne);
router.post("/reset-failed", openAiController.resetFailedDecodes);

module.exports = router;
