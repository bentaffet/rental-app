const express = require("express");

const listingController = require("../controllers/listingController");

const router = express.Router();

router.get("/", listingController.listListings);
router.get("/:id", listingController.getListing);

module.exports = router;
