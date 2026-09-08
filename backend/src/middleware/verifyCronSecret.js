function getBearerToken(header = "") {
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

function verifyCronSecret(req, res, next) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret && process.env.NODE_ENV !== "production") {
    return next();
  }

  const providedSecret =
    getBearerToken(req.get("authorization")) ||
    req.get("x-cron-secret") ||
    req.get("x-webhook-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({ error: "Invalid cron secret" });
  }

  return next();
}

module.exports = verifyCronSecret;
