const express = require("express");
const { getDatastoreMode } = require("../models/datastore");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "rental-api",
    datastore: getDatastoreMode(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/config", (req, res) => {
  res.json({
    datastore: getDatastoreMode(),
    brightDataApiKey: Boolean(process.env.BRIGHTDATA_API_KEY),
    firebaseServiceAccountJson: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
    openAiApiKey: Boolean(process.env.OPENAI_API_KEY),
    openAiProjectId: process.env.OPENAI_PROJECT_ID || null,
    openAiListingDecodeModel:
      process.env.OPENAI_LISTING_DECODE_MODEL || "gpt-4.1-mini",
  });
});

module.exports = router;
