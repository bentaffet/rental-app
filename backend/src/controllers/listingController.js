const listingService = require("../services/listingService");

async function listListings(req, res, next) {
  try {
    const listings = await listingService.searchListings(req.query);
    res.json({ listings });
  } catch (error) {
    next(error);
  }
}

async function getListing(req, res, next) {
  try {
    const listing = await listingService.getListingById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    return res.json({ listing });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listListings,
  getListing,
};
