function meta(name) {
  return $(`meta[property="${name}"]`).attr("content") || $(`meta[name="${name}"]`).attr("content") || null;
}

const canonicalUrl = $('link[rel="canonical"]').attr("href") || meta("og:url") || null;
const title = meta("og:title") || $("title").first().text() || "";
const description = meta("og:description") || meta("description") || null;
const groupMatch = canonicalUrl?.match(/facebook\.com\/groups\/([^/]+)/i);

return {
  group_id: groupMatch?.[1] || null,
  group_name: title.replace(/\s*\|\s*Facebook\s*$/i, "").trim() || null,
  group_url: canonicalUrl,
  description,
};
