function parseJson(value) {
  if (!value) return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

const response = parser.backend_brightdata_trigger;
const body = parseJson(response?.body || response?.data || response?.response || response);

return [
  {
    ok: Boolean(body?.job?.snapshot_id),
    snapshot_id: body?.job?.snapshot_id || null,
    status: body?.job?.status || null,
    group_scope: body?.job?.group_scope || null,
    response: body || response || null,
  },
];
