function normalizeGroupUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Input must include a Facebook group URL");

  const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const groupIndex = parts.findIndex((part) => part.toLowerCase() === "groups");
  const groupSlug = groupIndex >= 0 ? parts[groupIndex + 1] : null;

  if (!groupSlug) throw new Error("Use a Facebook group URL like https://www.facebook.com/groups/example");
  return `https://www.facebook.com/groups/${groupSlug}/`;
}

const backendUrl = String(input.backend_url || "").replace(/\/+$/, "");
if (!backendUrl) throw new Error("Pass your deployed backend URL as input.backend_url");

const groupUrl = normalizeGroupUrl(input.url);
const numOfPosts = +(input.num_of_posts || input.maxPosts || 25);

tag_request("backend_brightdata_trigger", {
  url: `${backendUrl}/api/brightdata/trigger`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(input.cron_secret ? { "x-cron-secret": input.cron_secret } : {}),
  },
  body: JSON.stringify({
    urls: [groupUrl],
    num_of_posts: numOfPosts,
  }),
});
