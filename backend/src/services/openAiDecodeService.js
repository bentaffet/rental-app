const listingModel = require("../models/listingModel");
const rawPostModel = require("../models/rawPostModel");
const { createListingDraft, decodeRawPost, hasDecodeInput } = require("./listingDecodeService");
const { buildDedupeKey } = require("./listingDedupeService");
const { applyListingLifecycle } = require("./listingLifecycleService");
const { fingerprintPhotoUrls, HASH_VERSION } = require("./imageFingerprintService");

function parseLimit(value) {
  const limit = Number(value || 5);
  return Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 25) : 5;
}

function isQuotaError(error) {
  const message = String(error?.message || "");
  const code = String(error?.code || error?.status || "");

  return (
    code === "429" ||
    code === "8" ||
    /RESOURCE_EXHAUSTED/i.test(message) ||
    /quota/i.test(message)
  );
}

async function decodePost(rawPost, options = {}) {
  try {
    if (
      !options.force &&
      ["decoded", "not_listing", "decoding"].includes(rawPost.decoded_status)
    ) {
      return {
        id: rawPost.id,
        status: "skipped",
        reason: `Already ${rawPost.decoded_status}`,
      };
    }

    if (!hasDecodeInput(rawPost)) {
      const listing = {
        ...createListingDraft(rawPost),
        is_listing: false,
        title: "Empty post",
        summary: null,
        decode_status: "not_listing",
        decoded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await listingModel.deleteListing(rawPost.id);
      await rawPostModel.upsertRawPost(rawPost.id, {
        ...rawPost,
        decoded_status: "not_listing",
        decoded_at: listing.decoded_at,
        updated_at: new Date().toISOString(),
      });

      return {
        id: rawPost.id,
        status: "not_listing",
        title: listing.title,
        price: null,
      };
    }

    await rawPostModel.upsertRawPost(rawPost.id, {
      ...rawPost,
      decoded_status: "decoding",
      decode_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const decoded = await decodeRawPost(rawPost);

    if (decoded.listing.decode_status === "decoded") {
      const imageHashes = await fingerprintPhotoUrls(decoded.listing.image_urls);
      await listingModel.upsertListing(rawPost.id, {
        ...applyListingLifecycle(decoded.listing),
        dedupe_key: buildDedupeKey(decoded.listing),
        image_hash_version: HASH_VERSION,
        image_hashes: imageHashes,
      });
    } else {
      await listingModel.deleteListing(rawPost.id);
    }
    await rawPostModel.upsertRawPost(rawPost.id, {
      ...rawPost,
      decoded_status: decoded.listing.decode_status,
      openai_response_id: decoded.response_id,
      openai_model: decoded.model,
      decoded_at: decoded.listing.decoded_at,
      updated_at: new Date().toISOString(),
    });

    return {
      id: rawPost.id,
      status: decoded.listing.decode_status,
      title: decoded.listing.title,
      price: decoded.listing.price,
    };
  } catch (error) {
    if (isQuotaError(error)) {
      await rawPostModel.upsertRawPost(rawPost.id, {
        ...rawPost,
        decoded_status: "pending",
        decode_error: error.message,
        updated_at: new Date().toISOString(),
      });

      return {
        id: rawPost.id,
        status: "quota_exhausted",
        error: error.message,
      };
    }

    await rawPostModel.upsertRawPost(rawPost.id, {
      ...rawPost,
      decoded_status: "decode_failed",
      decode_error: error.message,
      updated_at: new Date().toISOString(),
    });

    return {
      id: rawPost.id,
      status: "decode_failed",
      error: error.message,
    };
  }
}

async function decodePending(options = {}) {
  const limit = parseLimit(options.limit);
  const rawPosts = await rawPostModel.listPendingDecode(limit);
  const results = [];

  for (const rawPost of rawPosts) {
    const result = await decodePost(rawPost);
    results.push(result);

    if (result.status === "quota_exhausted") {
      break;
    }
  }

  return {
    requested: limit,
    found: rawPosts.length,
    decoded: results.filter((result) => result.status === "decoded").length,
    notListing: results.filter((result) => result.status === "not_listing").length,
    failed: results.filter((result) => result.status === "decode_failed").length,
    quotaExhausted: results.some((result) => result.status === "quota_exhausted"),
    results,
  };
}

async function decodeOne(id) {
  const rawPost = await rawPostModel.getRawPost(id);

  if (!rawPost) {
    const error = new Error("Raw post not found");
    error.status = 404;
    throw error;
  }

  return decodePost(rawPost, { force: true });
}

async function resetFailedDecodes() {
  const rawPosts = await rawPostModel.listRawPosts();
  const failedPosts = rawPosts.filter((post) =>
    ["decode_failed", "decoding"].includes(post.decoded_status)
  );

  for (const post of failedPosts) {
    await rawPostModel.upsertRawPost(post.id, {
      ...post,
      decoded_status: "pending",
      decode_error: null,
      updated_at: new Date().toISOString(),
    });
  }

  return {
    reset: failedPosts.length,
  };
}

module.exports = {
  decodeOne,
  decodePending,
  resetFailedDecodes,
};
