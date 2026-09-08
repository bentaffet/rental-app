const DATASET_ID = "gd_lz11l67o2cb3r0lkj3";
const API_BASE_URL = "https://api.brightdata.com/datasets/v3";

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

const groupUrl = normalizeGroupUrl(input.url);
const apiKey = input.api_key || input.brightdata_api_key || input.BRIGHTDATA_API_KEY;
const scrapeParams = `dataset_id=${DATASET_ID}&include_errors=true&format=json`;

if (!apiKey) throw new Error("Pass your Bright Data API key as input.api_key");

tag_request("facebook_group_posts", {
  url: `${API_BASE_URL}/scrape?${scrapeParams}`,
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    input: [{ url: groupUrl }],
  }),
});
