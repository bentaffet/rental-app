const listingModel = require("../models/listingModel");
const rawPostModel = require("../models/rawPostModel");
const { createListingDraft, decodeRawPost, hasDecodeInput } = require("./listingDecodeService");
const { buildDedupeKey } = require("./listingDedupeService");

function parseLimit(value) {
  const limit = Number(value || 5);
  return Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 25) : 5;
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
        red_flags: ["empty content"],
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
      await listingModel.upsertListing(rawPost.id, {
        ...decoded.listing,
        dedupe_key: buildDedupeKey(decoded.listing),
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
    results.push(await decodePost(rawPost));
  }

  return {
    requested: limit,
    found: rawPosts.length,
    decoded: results.filter((result) => result.status === "decoded").length,
    notListing: results.filter((result) => result.status === "not_listing").length,
    failed: results.filter((result) => result.status === "decode_failed").length,
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
