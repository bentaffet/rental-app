import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("../../backend/node_modules/sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, "../public/neighborhood-maps");
const tileSize = 256;
const outputSize = { width: 640, height: 480 };

const locations = [
  ["astoria", "Astoria", 40.7644, -73.9235],
  ["bed-stuy", "Bed-Stuy", 40.6872, -73.9418],
  ["brooklyn", "Brooklyn", 40.6782, -73.9442],
  ["bushwick", "Bushwick", 40.6958, -73.9171],
  ["chelsea", "Chelsea", 40.7465, -74.0014],
  ["clinton-hill", "Clinton Hill", 40.6894, -73.9633],
  ["crown-heights", "Crown Heights", 40.6694, -73.9422],
  ["east-village", "East Village", 40.7265, -73.9815],
  ["financial-district", "Financial District", 40.7075, -74.0113],
  ["fort-greene", "Fort Greene", 40.6921, -73.9742],
  ["greenpoint", "Greenpoint", 40.7308, -73.9515],
  ["harlem", "Harlem", 40.8116, -73.9465],
  ["hells-kitchen", "Hell's Kitchen", 40.7638, -73.9918],
  ["long-island-city", "Long Island City", 40.7447, -73.9485],
  ["lower-east-side", "Lower East Side", 40.715, -73.9843],
  ["manhattan", "Manhattan", 40.7831, -73.9712],
  ["murray-hill", "Murray Hill", 40.7479, -73.9765],
  ["new-york-city", "New York City", 40.7306, -73.9352],
  ["park-slope", "Park Slope", 40.6728, -73.9771],
  ["prospect-heights", "Prospect Heights", 40.6774, -73.9694],
  ["queens", "Queens", 40.7282, -73.7949],
  ["ridgewood", "Ridgewood", 40.7084, -73.9018],
  ["sunnyside", "Sunnyside", 40.7433, -73.9196],
  ["times-square", "Times Square", 40.758, -73.9855],
  ["upper-east-side", "Upper East Side", 40.7736, -73.9566],
  ["upper-west-side", "Upper West Side", 40.787, -73.9754],
  ["west-village", "West Village", 40.734, -74.0062],
  ["williamsburg", "Williamsburg", 40.7081, -73.9571],
];

function lonToTileX(lon, zoom) {
  return ((lon + 180) / 360) * 2 ** zoom;
}

function latToTileY(lat, zoom) {
  const latRadians = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) /
      2) *
    2 ** zoom
  );
}

async function fetchTile(zoom, x, y) {
  const response = await fetch(
    `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
    {
      headers: {
        "User-Agent": "RoomUp local development map cache",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Tile failed with ${response.status}: ${zoom}/${x}/${y}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function markerSvg(label) {
  const safeLabel = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect x="18" y="18" width="220" height="48" rx="8" fill="#ffffff" fill-opacity=".94"/>
  <text x="36" y="49" fill="#19231f" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">${safeLabel}</text>
  <circle cx="320" cy="256" r="22" fill="#19231f" opacity=".18"/>
  <path d="M320 168c-34 0-60 26-60 58 0 43 60 105 60 105s60-62 60-105c0-32-26-58-60-58z" fill="#b85c38"/>
  <circle cx="320" cy="226" r="23" fill="#ffffff"/>
  <circle cx="320" cy="226" r="11" fill="#596b4e"/>
</svg>`);
}

async function generateMap(slug, label, lat, lon) {
  const zoom = ["new-york-city", "brooklyn", "manhattan", "queens"].includes(slug)
    ? 11
    : 14;
  const centerX = lonToTileX(lon, zoom);
  const centerY = latToTileY(lat, zoom);
  const startX = Math.floor(centerX) - 2;
  const startY = Math.floor(centerY) - 2;
  const composites = [];

  for (let xOffset = 0; xOffset < 5; xOffset += 1) {
    for (let yOffset = 0; yOffset < 5; yOffset += 1) {
      composites.push({
        input: await fetchTile(zoom, startX + xOffset, startY + yOffset),
        left: xOffset * tileSize,
        top: yOffset * tileSize,
      });
    }
  }

  const centerPixelX = (centerX - startX) * tileSize;
  const centerPixelY = (centerY - startY) * tileSize;

  await sharp({
    create: {
      width: tileSize * 5,
      height: tileSize * 5,
      channels: 4,
      background: "#f2f0ea",
    },
  })
    .composite(composites)
    .extract({
      left: Math.round(centerPixelX - outputSize.width / 2),
      top: Math.round(centerPixelY - outputSize.height / 2),
      width: outputSize.width,
      height: outputSize.height,
    })
    .composite([{ input: markerSvg(label), left: 0, top: 0 }])
    .png()
    .toFile(path.join(outputDir, `${slug}.png`));
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const [slug, label, lat, lng] of locations) {
  console.log(`Generating ${label}`);
  await generateMap(slug, label, lat, lng);
}
