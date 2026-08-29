function getBearerToken(header = "") {
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

function verifyBrightDataWebhook(req, res, next) {
  const expectedSecret = process.env.BRIGHTDATA_WEBHOOK_SECRET;

  if (!expectedSecret && process.env.NODE_ENV !== "production") {
    return next();
  }

  const providedSecret =
    getBearerToken(req.get("authorization")) ||
    req.get("x-brightdata-secret") ||
    req.get("x-webhook-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({ error: "Invalid Bright Data webhook secret" });
  }

  return next();
}

module.exports = verifyBrightDataWebhook;
