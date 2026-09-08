function parseJson(value) {
  if (!value) return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

const response = parser.facebook_group_posts;
const body = parseJson(response?.body || response?.data || response?.response || response);
const limit = +(input.num_of_posts || input.maxPosts || 25);

if (Array.isArray(body)) {
  return body.slice(0, limit);
}

if (body?.snapshot_id) {
  return [
    {
      snapshot_id: body.snapshot_id,
      status: "running",
      message: "Bright Data returned a snapshot_id instead of immediate rows. Download this snapshot from the Datasets API when it is ready.",
    },
  ];
}

return [
  {
    error: "No Facebook group posts returned",
    response: body || response || null,
  },
];
