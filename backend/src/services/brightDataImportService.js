const crypto = require("crypto");
const { z } = require("zod");

const rawPostModel = require("../models/rawPostModel");

const brightDataPostSchema = z
  .object({
    url: z.string().optional().nullable(),
    post_id: z.string().optional().nullable(),
    group_id: z.string().optional().nullable(),
    group_name: z.string().optional().nullable(),
    group_url: z.string().optional().nullable(),
    content: z.string().optional().nullable(),
    date_posted: z.string().optional().nullable(),
    user_username_raw: z.string().optional().nullable(),
    attachments: z.array(z.any()).optional().nullable(),
  })
  .passthrough();

function stableHash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function getRecords(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.records)) {
    return payload.records;
  }

  if (payload && typeof payload === "object") {
    return [payload];
  }

  return [];
}

function buildRawPostId(post) {
  const groupId = post.group_id || "unknown-group";
  const postId = post.post_id || stableHash(post.url || post.content || post);
  return `${groupId}_${postId}`;
}

function nextDecodeStatus(existing) {
  if (["decoded", "not_listing"].includes(existing?.decoded_status)) {
    return existing.decoded_status;
  }

  return "pending";
}

async function importBrightDataPayload(payload, options = {}) {
  const records = getRecords(payload);
  const summary = {
    received: records.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    decodeQueued: 0,
    rawPostIds: [],
    decodeQueuedIds: [],
    errors: [],
  };

  for (const record of records) {
    const parsed = brightDataPostSchema.safeParse(record);

    if (!parsed.success) {
      summary.errors.push({
        reason: "Invalid record shape",
        issues: parsed.error.issues,
      });
      continue;
    }

    const post = parsed.data;
    const id = buildRawPostId(post);
    const contentHash = stableHash({
      content: post.content,
      attachments: post.attachments,
      date_posted: post.date_posted,
    });

    const existing = await rawPostModel.getRawPost(id);
    summary.rawPostIds.push(id);

    if (existing?.content_hash === contentHash) {
      summary.skipped += 1;
      continue;
    }

    const rawPost = {
      id,
      post_id: post.post_id || null,
      group_id: post.group_id || null,
      group_name: post.group_name || null,
      group_url: post.group_url || post.input?.url || null,
      url: post.url || null,
      content: post.content || "",
      attachments: post.attachments || [],
      date_posted: post.date_posted || null,
      author_name: post.user_username_raw || null,
      raw_payload: post,
      content_hash: contentHash,
      decoded_status: nextDecodeStatus(existing),
      source_snapshot_id: existing?.source_snapshot_id || options.snapshotId || null,
      latest_snapshot_id: options.snapshotId || existing?.latest_snapshot_id || null,
      imported_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await rawPostModel.upsertRawPost(id, rawPost);

    if (existing) {
      summary.updated += 1;
    } else {
      summary.imported += 1;
    }

    if (rawPost.decoded_status === "pending") {
      summary.decodeQueued += 1;
      summary.decodeQueuedIds.push(id);
    }
  }

  return summary;
}

module.exports = {
  importBrightDataPayload,
};
