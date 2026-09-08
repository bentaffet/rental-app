close_popup('[aria-label="Allow All Cookies"]', '[aria-label="Allow All Cookies"]');
close_popup('[aria-label="Allow all cookies"]', '[aria-label="Allow all cookies"]');
close_popup(
  'div[aria-label="Allow essential and optional cookies"][role="button"]',
  'div[aria-label="Allow essential and optional cookies"][role="button"]'
);

const POST_LIMIT = +(input.num_of_posts || input.maxPosts || 25);
const startTs = new Date();

function parseJsonLines(response) {
  if (!response) return [];
  if (typeof response === "object") return [response];
  return response
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

function firstDeep(value, predicate) {
  const stack = [value];
  const seen = new Set();

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);

    if (predicate(current)) return current;

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
    } else {
      for (const key of Object.keys(current)) stack.push(current[key]);
    }
  }

  return null;
}

function allDeep(value, predicate) {
  const matches = [];
  const stack = [value];
  const seen = new Set();

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);

    if (predicate(current)) matches.push(current);

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
    } else {
      for (const key of Object.keys(current)) stack.push(current[key]);
    }
  }

  return matches;
}

function getEndCursor(response) {
  for (const part of parseJsonLines(response)) {
    const pageInfo = firstDeep(part, (node) => node.end_cursor && node.has_next_page !== undefined);
    if (pageInfo?.end_cursor) return pageInfo.end_cursor;
  }

  return null;
}

function getText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.text === "string") return value.text;
  if (typeof value.message?.text === "string") return value.message.text;
  if (typeof value.story?.message?.text === "string") return value.story.message.text;
  return "";
}

function getStorySections(response) {
  const parts = parseJsonLines(response);
  const sections = [];

  for (const part of parts) {
    const cometSections = allDeep(part, (node) => {
      return node.comet_sections && (
        node.__typename === "Story" ||
        node.post_id ||
        node.story?.post_id ||
        getText(node.comet_sections?.message)
      );
    });

    for (const story of cometSections) {
      sections.push(story.comet_sections ? story : story.story || story);
    }
  }

  return sections;
}

function getFeedback(section) {
  return (
    section?.feedback?.story?.feedback_context?.feedback_target_with_context?.ufi_renderer?.feedback?.comet_ufi_summary_and_actions_renderer?.feedback ||
    section?.feedback?.story?.feedback_context?.feedback_target_with_context?.comet_ufi_summary_and_actions_renderer?.feedback ||
    section?.feedback?.story?.comet_feed_ufi_container?.story?.feedback_context?.feedback_target_with_context?.ufi_renderer?.feedback?.comet_ufi_summary_and_actions_renderer?.feedback ||
    firstDeep(section, (node) => node.reaction_count || node.total_comment_count || node.share_count) ||
    null
  );
}

function getImages(section) {
  const images = allDeep(section, (node) => {
    return (
      typeof node.uri === "string" &&
      /^https?:\/\//.test(node.uri) &&
      !node.uri.includes("static.xx.fbcdn.net")
    );
  }).map((node) => node.uri);

  return Array.from(new Set(images)).slice(0, 12);
}

function getAuthor(section) {
  const actor = firstDeep(section, (node) => {
    return (
      (node.__typename === "User" || node.__typename === "Page" || node.name) &&
      (node.url || node.profile_url || node.id)
    );
  });

  return actor?.name || actor?.short_name || actor?.username || null;
}

function getPostId(section) {
  return (
    section?.feedback?.story?.post_id ||
    section?.feedback?.story?.comet_feed_ufi_container?.story?.post_id ||
    section?.feedback?.story?.feedback_context?.feedback_target_with_context?.ufi_renderer?.feedback?.subscription_target_id ||
    section?.post_id ||
    firstDeep(section, (node) => typeof node.post_id === "string")?.post_id ||
    null
  );
}

function getPostUrl(section, postId, groupUrl) {
  const directUrl = firstDeep(section, (node) => {
    return typeof node.wwwURL === "string" || typeof node.url === "string" && node.url.includes("facebook.com");
  });
  const raw = directUrl?.wwwURL || directUrl?.url;
  if (raw) return raw;
  if (postId) return `${groupUrl.replace(/\/+$/, "")}/posts/${postId}`;
  return null;
}

function getCreationTime(section) {
  return (
    section?.context_layout?.story?.comet_sections?.metadata?.find((item) => item?.story?.creation_time)?.story?.creation_time ||
    firstDeep(section, (node) => Number.isFinite(node.creation_time))?.creation_time ||
    null
  );
}

function getContent(section) {
  return (
    getText(section?.content?.story?.comet_sections?.message?.story?.message) ||
    getText(section?.content?.story?.comet_sections?.message?.story?.message?.text) ||
    getText(section?.content?.story?.comet_sections?.message) ||
    getText(firstDeep(section, (node) => typeof node.text === "string" && node.text.length > 10)) ||
    ""
  );
}

function getGroupIdFromUrl(groupUrl) {
  const parts = new URL(groupUrl).pathname.split("/").filter(Boolean);
  const groupIndex = parts.findIndex((part) => part.toLowerCase() === "groups");
  return groupIndex >= 0 ? parts[groupIndex + 1] : null;
}

function mapPosts(response, groupUrl) {
  const groupId = getGroupIdFromUrl(groupUrl);
  const groupName = input.name || input.group_name || null;

  return getStorySections(response)
    .map((section) => {
      const postId = getPostId(section);
      const content = getContent(section);
      const createdAt = getCreationTime(section);
      const images = getImages(section);
      const feedback = getFeedback(section);

      return {
        url: getPostUrl(section, postId, groupUrl),
        post_id: postId,
        group_id: groupId,
        group_name: groupName,
        group_url: groupUrl,
        content,
        date_posted: createdAt ? new Date(createdAt * 1000).toISOString() : null,
        user_username_raw: getAuthor(section),
        attachments: images.map((url) => ({ type: "image", url })),
        reaction_count: feedback?.reaction_count?.count || feedback?.reaction_count || 0,
        comment_count: feedback?.total_comment_count || 0,
        share_count: feedback?.share_count?.count || 0,
      };
    })
    .filter((post) => post.post_id || post.content || post.url);
}

function normalizeGroupUrl(value) {
  const url = new URL(value.startsWith("http") ? value : `https://${value}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const groupIndex = parts.findIndex((part) => part.toLowerCase() === "groups");
  const groupSlug = groupIndex >= 0 ? parts[groupIndex + 1] : null;

  if (!groupSlug) throw new Error("Input URL must be a Facebook group URL");
  return `https://www.facebook.com/groups/${groupSlug}/`;
}

function normalizeCaptureResult(result) {
  if (!result) return null;

  if (Array.isArray(result)) {
    return { query: result[0], response: result[1] };
  }

  if (result.ret) return normalizeCaptureResult(result.ret);
  if (result.retval) return normalizeCaptureResult(result.retval);
  if (result.wait_retval) return normalizeCaptureResult(result.wait_retval);

  const query =
    result.query ||
    result.request ||
    result.request_payload ||
    result.payload ||
    result.req ||
    null;
  const response =
    result.response ||
    result.response_body ||
    result.body ||
    result.data ||
    result.res ||
    null;

  return { query, response, raw: result };
}

function getFriendlyName(query) {
  if (!query) return "";

  const variables = getVariables(query);

  return (
    query.fb_api_req_friendly_name ||
    query.payload?.fb_api_req_friendly_name ||
    variables.fb_api_req_friendly_name ||
    ""
  );
}

function isLoginWallQuery(query) {
  return /login|credential|pseudoblocked|interstitial/i.test(getFriendlyName(query));
}

function dismissBlockingDialogs() {
  const cookieSelectors = [
    '[aria-label="Allow All Cookies"]',
    '[aria-label="Allow all cookies"]',
    'div[aria-label="Allow essential and optional cookies"][role="button"]',
    'div[aria-label="Allow only essential cookies"][role="button"]',
    'div[aria-label="Decline optional cookies"][role="button"]',
  ];
  const dialogSelectors = [
    'div[aria-label="Close"][role="button"]',
    '[aria-label="Close"]',
    'div[aria-label="Not now"][role="button"]',
  ];

  for (const selector of cookieSelectors) {
    try {
      if (el_is_visible(selector)) {
        click(selector);
        wait_page_idle({ timeout: 10000 });
        break;
      }
    } catch (error) {
      console.error(`Dialog dismissal warning for ${selector}: ${error.message}`);
    }
  }

  for (const selector of dialogSelectors) {
    try {
      if (el_is_visible(selector)) {
        click(selector);
        wait_page_idle({ timeout: 10000 });
        break;
      }
    } catch (error) {
      console.error(`Dialog dismissal warning for ${selector}: ${error.message}`);
    }
  }
}

function getVariables(query) {
  if (!query) return {};
  if (input.variables) return input.variables;
  if (!query.variables) return {};
  if (typeof query.variables === "string") {
    try {
      return JSON.parse(query.variables || "{}");
    } catch (error) {
      return {};
    }
  }
  return query.variables;
}

function captureFirstGraphql(captures) {
  for (const capture of captures) {
    try {
      const result = normalizeCaptureResult(capture.wait_captured());
      const query = result?.query;
      const response = result?.response;

      if (query && response) {
        const posts = mapPosts(response, input.url || "");
        const endCursor = getEndCursor(response);
        const name = getFriendlyName(query);
        console.error(`Captured GraphQL request${name ? `: ${name}` : ""}; posts=${posts.length}; cursor=${Boolean(endCursor)}`);
        if (isLoginWallQuery(query)) {
          throw new Error(
            `Facebook showed a login/interstitial flow (${name}) instead of the group feed. Close/login-wall scraping cannot collect group posts from this session.`
          );
        }
        if (posts.length || endCursor) return { capture, query, response };
      } else {
        const keys = result?.raw && typeof result.raw === "object" ? Object.keys(result.raw).join(",") : typeof result?.raw;
        console.error(`GraphQL capture did not include query+response; shape=${keys || "empty"}`);
      }
    } catch (error) {
      if (/login\/interstitial|pseudoblocked/i.test(error.message)) throw error;
      console.error(`GraphQL capture warning: ${error.message}`);
    }
  }

  return null;
}

if (input.cookies) set_session_cookies(JSON.parse(input.cookies));

const groupUrl = normalizeGroupUrl(input.url);
const captures = [
  capture_graphql({ payload: { fb_api_caller_class: "RelayModern" } }),
  capture_graphql({ payload: { fb_api_req_friendly_name: "CometGroupRootQuery" } }),
  capture_graphql({ payload: { fb_api_req_friendly_name: "GroupsCometFeedRegularStoriesPaginationQuery" } }),
  capture_graphql({ payload: { fb_api_req_friendly_name: "GroupsCometFeedHoistedStoriesnPaginationQuery" } }),
  capture_graphql({ payload: { fb_api_req_friendly_name: "GroupsCometDiscussionLayoutRootQuery" } }),
  capture_graphql({ payload: { fb_api_req_friendly_name: "GroupsCometCrossGroupFeedPaginationQuery" } }),
  capture_graphql({ payload: { fb_api_req_friendly_name: "CometGroupDiscussionRootQuery" } }),
  capture_graphql({ payload: { fb_api_req_friendly_name: "CometGroupDiscussionRootSuccessQuery" } }),
  capture_graphql({ payload: { fb_api_req_friendly_name: "CometModernGroupsFeedPaginationQuery" } }),
];

block([
  "*.jpg*",
  "*.png*",
  "*.gif*",
  "*.svg*",
  "*.ico*",
  "*.ttf*",
  "*.woff*",
  "*.woff2*",
  "*googletagmanager*",
  "*google-analytics*",
  "*doubleclick.net*",
  "*fonts.gstatic.com*",
  "*fonts.googleapis.com*",
]);

country(["us", "ca", "gb"][Math.random() * 3 | 0]);
enable_peer_swap();
navigate(groupUrl, { wait_until: "load" });
wait_page_idle({ timeout: 10000 });
dismissBlockingDialogs();

if (location.pathname.startsWith("/login")) {
  throw new Error(
    "Facebook redirected this group URL to the login page, so there are no group posts available to scrape in this session. Use Bright Data's built-in Facebook Posts/Groups dataset for group URL discovery, or provide a compliant logged-in session/cookies if your Bright Data setup allows it."
  );
}

wait_any([
  '[aria-label="Allow all cookies"]',
  'div[aria-label="Allow essential and optional cookies"][role="button"]',
  'div[aria-label="Allow only essential cookies"][role="button"]',
  'div[aria-label="Decline optional cookies"][role="button"]',
  '[aria-label="Close"]',
  'div[aria-label="Close"][role="button"]',
  'div[aria-label="Not now"][role="button"]',
  'div[role="feed"]',
  'div[aria-label="Discussion"]',
  'h1',
  "._585r._50f4",
], { timeout: 50000 });

wait_page_idle({ timeout: 10000 });
dismissBlockingDialogs();
if (el_exists("._585r._50f4")) throw new Error("Content is behind login");
if (location.pathname.startsWith("/login")) {
  throw new Error(
    "Facebook redirected this group URL to the login page, so there are no group posts available to scrape in this session. Use Bright Data's built-in Facebook Posts/Groups dataset for group URL discovery, or provide a compliant logged-in session/cookies if your Bright Data setup allows it."
  );
}

press_key("Escape");
scroll_to("bottom", { immediate: true });
scroll_to("bottom", { immediate: true });
scroll_to("bottom", { immediate: true });

let captured = captureFirstGraphql(captures);
if (!captured) {
  throw new Error(
    "Failed to capture a usable Facebook group feed GraphQL request. Open the Bright Data run log and look for the last `Captured GraphQL request:` line, then add that fb_api_req_friendly_name to the captures list."
  );
}

let query = input.query || captured.query;
let variables = getVariables(query);
let endCursor = input.end_cursor || getEndCursor(captured.response);
let total = [];
let seen = new Set();

function addBatch(response) {
  for (const post of mapPosts(response, groupUrl)) {
    const key = post.post_id || post.url || post.content;
    if (seen.has(key)) continue;
    seen.add(key);
    total.push(post);
  }
}

if (!input.rerun) addBatch(captured.response);

let loads = 0;
let errors = 0;
while (
  endCursor &&
  loads < 500 &&
  errors < 5 &&
  total.length < POST_LIMIT &&
  Math.round((new Date().getTime() - startTs.getTime()) / 60000) < 7
) {
  variables.cursor = endCursor;

  try {
    const response = captured.capture.replay({
      ...query,
      variables: JSON.stringify(variables),
    });
    endCursor = getEndCursor(response);
    addBatch(response);
    errors = 0;
  } catch (error) {
    errors++;
    console.error(`Pagination warning: ${error.message}`);
  }

  loads++;
}

total.slice(0, POST_LIMIT).forEach((post) => collect(post));

if (endCursor && total.length < POST_LIMIT) {
  const cookies = JSON.stringify(get_session_cookies([location.href]).cookies);
  rerun_stage({
    ...input,
    cookies,
    end_cursor: endCursor,
    variables,
    query,
    count: (input.count || 0) + total.length,
    rerun: true,
  });
}
