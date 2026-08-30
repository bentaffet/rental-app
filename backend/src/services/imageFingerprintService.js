const sharp = require("sharp");

const HASH_VERSION = 1;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PHOTOS_PER_LISTING = 10;

function bitsToHex(bits) {
  let value = 0n;

  for (const bit of bits) {
    value = (value << 1n) | BigInt(bit);
  }

  return value.toString(16).padStart(bits.length / 4, "0");
}

async function visualHash(imageBuffer) {
  const image = sharp(imageBuffer).rotate();
  const differencePixels = await image
    .clone()
    .resize(9, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
  const differenceBits = [];

  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const offset = y * 9 + x;
      differenceBits.push(differencePixels[offset] > differencePixels[offset + 1] ? 1 : 0);
    }
  }

  const averagePixels = await image
    .clone()
    .resize(8, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
  const average = averagePixels.reduce((sum, value) => sum + value, 0) / averagePixels.length;
  const averageBits = Array.from(averagePixels, (value) => (value >= average ? 1 : 0));

  return `v${HASH_VERSION}:${bitsToHex(differenceBits)}${bitsToHex(averageBits)}`;
}

async function downloadImage(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { "user-agent": "RoomUp image fingerprint/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Image download failed with ${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds fingerprint size limit");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds fingerprint size limit");
  }

  return imageBuffer;
}

async function fingerprintPhotoUrls(urls) {
  const uniqueUrls = Array.from(new Set((urls || []).filter(Boolean))).slice(
    0,
    MAX_PHOTOS_PER_LISTING
  );
  const hashes = await Promise.all(
    uniqueUrls.map(async (url) => {
      try {
        return await visualHash(await downloadImage(url));
      } catch {
        return null;
      }
    })
  );

  return Array.from(new Set(hashes.filter(Boolean)));
}

module.exports = {
  HASH_VERSION,
  fingerprintPhotoUrls,
  visualHash,
};
