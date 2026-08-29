const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const brightDataRoutes = require("./routes/brightDataRoutes");
const healthRoutes = require("./routes/healthRoutes");
const listingRoutes = require("./routes/listingRoutes");
const openAiRoutes = require("./routes/openAiRoutes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/api/health", healthRoutes);
app.use("/api/brightdata", brightDataRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/openai", openAiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.message || "Unexpected server error",
  });
});

module.exports = app;
