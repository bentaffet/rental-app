import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CloudDownload,
  Plus,
  Play,
  RefreshCw,
  WandSparkles,
  Wrench,
} from "lucide-react";
import {
  addTrackedGroup,
  decodePendingListings,
  getBrightDataJobs,
  getBrightDataSnapshotStatus,
  getGroupStats,
  getPostTimeline,
  getSnapshotDecodeProgress,
  getTrackedGroups,
  importBrightDataSnapshot,
  resetFailedDecodes,
  triggerBrightDataSnapshot,
} from "../utils/apiClient.js";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatHourTick(value) {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hour = date.getHours();
  const suffix = hour < 12 ? "a" : "p";
  const displayHour = hour % 12 || 12;
  return `${displayHour}${suffix}`;
}

function formatDateTick(value) {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function isNewTimelineDay(bucket, previousBucket) {
  if (!bucket || !previousBucket) {
    return true;
  }

  return new Date(bucket.start).toDateString() !== new Date(previousBucket.start).toDateString();
}

function statusTone(status) {
  if (status === "ready") return "badge-success";
  if (status === "failed" || status === "canceled") return "badge-error";
  if (status === "running" || status === "starting") return "badge-warning";
  return "badge-ghost";
}

function normalizeGroupUrl(url = "") {
  return String(url).replace(/\/+$/, "");
}

function isGeneratedGroupName(name = "") {
  return /^Facebook group\b/i.test(String(name));
}

function correctKnownGroupName(name = "") {
  if (name === "NYC APARTMENTS FOR RENT") return "NYC Sublets";
  if (name === "NYC Sublets") return "NYC APARTMENTS FOR RENT";
  return name;
}

function resolveGroupDisplayName(input, groupStats = []) {
  const inputUrl = normalizeGroupUrl(input?.url);
  const stats = groupStats.find((group) => normalizeGroupUrl(group.url) === inputUrl);

  if (stats?.group_name) return correctKnownGroupName(stats.group_name);
  if (input?.group_name) return correctKnownGroupName(input.group_name);
  if (input?.name && !isGeneratedGroupName(input.name)) {
    return correctKnownGroupName(input.name);
  }
  return "Group name unavailable";
}

function jobInputNames(job, groupStats = []) {
  const inputs = Array.isArray(job?.inputs) ? job.inputs : [];
  return inputs.map((input) => resolveGroupDisplayName(input, groupStats)).filter(Boolean);
}

function jobGroupLabel(job, totalGroups = 0, groupStats = []) {
  const names = jobInputNames(job, groupStats);
  if (names.length === 1) return names[0];
  if (names.length > 1 && totalGroups > 0 && names.length === totalGroups) return "All groups";
  if (names.length > 1) return `${names.length} groups`;
  if (job?.group_scope) return job.group_scope;
  return "Unknown group";
}

function jobGroupDetail(job, groupStats = []) {
  const names = jobInputNames(job, groupStats);
  return names.length > 1 ? names.join(", ") : "";
}

function snapshotDetail(job) {
  const summary = job?.import_summary;

  if (!summary) {
    return job?.status === "ready" ? "Ready to import" : "";
  }

  return `Imported ${summary.imported || 0}, updated ${summary.updated || 0}, skipped ${
    summary.skipped || 0
  }`;
}

function formatDecodeProgress(progress) {
  if (!progress?.available) return "";
  return `Snapshot decode: ${progress.decoded}/${progress.total} decoded · ${progress.pending} pending`;
}

function quotaMessage(results) {
  return results
    .filter((result) => result?.quota_exhausted)
    .map((result) => result.message)
    .filter(Boolean)
    .join(" ");
}

function mergeTrackedGroupsWithStats(groups, groupStats) {
  const statsByUrl = new Map(
    groupStats.map((group) => [normalizeGroupUrl(group.url), group])
  );

  return groups.map((group) => {
    const stats = statsByUrl.get(normalizeGroupUrl(group.url));
    return {
      ...group,
      ...(stats || {}),
      url: group.url,
      display_name:
        correctKnownGroupName(stats?.group_name) ||
        correctKnownGroupName(group.group_name) ||
        correctKnownGroupName(!isGeneratedGroupName(group.name) ? group.name : "") ||
        "Group name unavailable",
    };
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function TimelineChart({ timeline, isLoading, onRefresh }) {
  const buckets = timeline?.buckets || [];
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <div className="min-w-0 overflow-hidden rounded bg-base-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Post timeline</h2>
        <div className="flex flex-wrap items-center gap-3">
          {timeline && (
            <div className="text-sm text-base-content/60">
              {timeline.dated_posts || 0} dated · {timeline.missing_dates || 0} missing dates ·{" "}
              {timeline.missing_times || 0} missing times
            </div>
          )}
          <button
            type="button"
            className="btn btn-outline btn-sm gap-2"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? <span className="loading loading-spinner loading-xs" /> : <RefreshCw size={15} />}
            Refresh timeline
          </button>
        </div>
      </div>

      {!timeline ? (
        <p className="mt-3 text-sm text-base-content/60">Timeline not loaded</p>
      ) : buckets.length === 0 ? (
        <p className="mt-3 text-sm text-base-content/60">No dated posts yet</p>
      ) : (
        <div className="mt-4 w-full min-w-0 overflow-x-auto px-3 pb-2">
          <div className="min-w-max pr-6">
            <div className="flex h-44 items-end gap-1 border-b border-base-300 pb-2">
              {buckets.map((bucket) => {
                const height = bucket.count ? Math.max((bucket.count / maxCount) * 100, 8) : 4;

                return (
                  <div
                    key={bucket.start}
                    className="flex h-full w-9 shrink-0 flex-col items-center justify-end gap-1"
                    title={`${formatDateTime(bucket.start)} · ${bucket.count} posts`}
                  >
                    <span className="text-[11px] text-base-content/60">
                      {bucket.count || ""}
                    </span>
                    <div className="flex h-36 w-full items-end">
                      <div
                        className={`w-full rounded-t ${bucket.count ? "bg-primary" : "bg-base-300"}`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1 text-xs text-base-content/50">
              {buckets.map((bucket, index) => {
                const showDate = isNewTimelineDay(bucket, buckets[index - 1]);

                return (
                  <div key={bucket.start} className="w-9 shrink-0 text-center">
                    <div className="font-medium text-base-content/70">
                      {formatHourTick(bucket.start)}
                    </div>
                    <div className="h-4 whitespace-nowrap text-[10px]">
                      {showDate ? formatDateTick(bucket.start) : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-center text-xs text-base-content/50">
            {timeline.bucket_hours} hour buckets
          </div>
        </div>
      )}
    </div>
  );
}

export default function PipelineTester() {
  const [groups, setGroups] = useState([]);
  const [groupStats, setGroupStats] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [decodeLimit, setDecodeLimit] = useState(5);
  const [postCount, setPostCount] = useState(25);
  const [selectedGroupUrl, setSelectedGroupUrl] = useState("all");
  const [timeline, setTimeline] = useState(null);
  const [pipelineStep, setPipelineStep] = useState("");
  const [newGroupUrl, setNewGroupUrl] = useState("");
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [snapshotProgress, setSnapshotProgress] = useState({});
  const groupRows = useMemo(
    () => mergeTrackedGroupsWithStats(groups, groupStats),
    [groups, groupStats]
  );

  useEffect(() => {
    Promise.all([getTrackedGroups(), getBrightDataJobs()])
      .then(([groupResult, jobResult]) => {
        setGroups(groupResult.groups || []);
        setJobs(jobResult.jobs || []);
        setActiveJob(jobResult.jobs?.[0] || null);
        refreshOpenJobs(jobResult.jobs || []);
        const quotaNotice = quotaMessage([groupResult, jobResult]);
        if (quotaNotice) {
          setMessage(quotaNotice);
        }
      })
      .catch((error) => setMessage(error.message));
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshGroupStats() {
    const statsResult = await getGroupStats();
    setGroupStats(statsResult.groups || []);

    if (statsResult.quota_exhausted) {
      setMessage(statsResult.message || "Firestore quota is exhausted; group stats cannot be loaded right now.");
    }
  }

  const refreshTimeline = () =>
    runAction("timeline", async () => {
      const groupUrl = selectedGroupUrl === "all" ? "" : selectedGroupUrl;
      const result = await getPostTimeline(groupUrl);
      setTimeline(result.timeline || null);

      if (result.quota_exhausted) {
        setMessage("Firestore quota is still exhausted, so the timeline could not load yet.");
      }
    });

  async function loadSnapshotProgress(job = activeJob) {
    if (!job?.snapshot_id || !job.import_summary) {
      return;
    }

    const result = await getSnapshotDecodeProgress(job.snapshot_id);
    setSnapshotProgress((current) => ({
      ...current,
      [job.snapshot_id]: result.progress,
    }));

    if (result.quota_exhausted) {
      setMessage(result.message || "Snapshot decode progress cannot be loaded right now.");
    }
  }

  async function refreshOpenJobs(jobList = jobs) {
    const openJobs = jobList.filter((job) =>
      job.snapshot_id &&
      (["starting", "running"].includes(job.status) ||
        (job.status === "ready" && !job.imported_at && !job.import_summary))
    );

    if (openJobs.length === 0) {
      return;
    }

    const refreshedJobs = await Promise.all(
      openJobs.map((job) =>
        getBrightDataSnapshotStatus(job.snapshot_id)
          .then((result) => result.job)
          .catch(() => job)
      )
    );

    for (const job of refreshedJobs) {
      updateJob(job);

      if (job.status === "ready" && !job.imported_at && !job.import_summary) {
        await importAndDecodeReadySnapshot(job);
      }
    }
  }

  async function runAction(actionName, action) {
    setLoadingAction(actionName);
    setMessage("");
    setPipelineStep("");

    try {
      await action();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingAction("");
      setPipelineStep("");
    }
  }

  function updateJob(job) {
    setActiveJob(job);
    setJobs((current) => {
      const others = current.filter((item) => item.snapshot_id !== job.snapshot_id);
      return [job, ...others];
    });
  }

  async function decodeUntilClear(maxBatches = 1) {
    let totalDecoded = 0;
    let totalNotListings = 0;
    let totalFailed = 0;
    let batches = 0;
    let quotaExhausted = false;

    while (batches < maxBatches) {
      setPipelineStep(`Decoding batch ${batches + 1}`);
      const result = await decodePendingListings(decodeLimit);

      totalDecoded += result.decoded || 0;
      totalNotListings += result.notListing || 0;
      totalFailed += result.failed || 0;
      quotaExhausted = quotaExhausted || !!result.quotaExhausted;
      batches += 1;

      if (quotaExhausted || !result.found || result.found < decodeLimit) {
        break;
      }
    }

    return {
      decoded: totalDecoded,
      notListing: totalNotListings,
      failed: totalFailed,
      batches,
      quotaExhausted,
    };
  }

  async function importAndDecodeReadySnapshot(job) {
    setPipelineStep("Importing posts");
    const importResult = await importBrightDataSnapshot(job.snapshot_id);
    updateJob(importResult.job);
    await refreshGroupStats();

    if (!importResult.import_summary.decodeQueued) {
      setMessage(
        `Imported ${importResult.import_summary.imported} new, updated ${importResult.import_summary.updated}, skipped ${importResult.import_summary.skipped}. No new posts to decode.`
      );
      return;
    }

    const decodeResult = await decodeUntilClear();
    await refreshGroupStats();
    await loadSnapshotProgress(importResult.job);
    const decodeMessage = decodeResult.quotaExhausted
      ? "A service quota was exhausted, so decoding paused. Remaining posts are still pending."
      : `Decoded ${decodeResult.decoded}, not listings ${decodeResult.notListing}, failed ${decodeResult.failed}.`;

    setMessage(
      `Imported ${importResult.import_summary.imported} new, updated ${importResult.import_summary.updated}, skipped ${importResult.import_summary.skipped}. ${decodeMessage}`
    );
  }

  const saveGroup = () =>
    runAction("addGroup", async () => {
      const result = await addTrackedGroup(newGroupUrl, postCount);
      const groupResult = await getTrackedGroups();
      setGroups(groupResult.groups || []);
      setNewGroupUrl("");
      setShowAddGroup(false);
      await refreshGroupStats();
      setMessage(
        result.group.already_tracked
          ? "That group is already tracked."
          : "Added group. Its Facebook name will appear after the first import."
      );
    });

  async function waitForReadySnapshot(job) {
    let currentJob = job;

    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (["ready", "failed", "canceled"].includes(currentJob.status)) {
        return currentJob;
      }

      setPipelineStep(`Waiting for Bright Data · check ${attempt + 1}`);
      await sleep(30000);

      const result = await getBrightDataSnapshotStatus(currentJob.snapshot_id);
      currentJob = result.job;
      updateJob(currentJob);
    }

    const error = new Error("Snapshot is still running. Check status again in a bit.");
    error.status = 408;
    throw error;
  }

  const startSnapshot = () =>
    runAction("trigger", async () => {
      const selectedGroup =
        selectedGroupUrl === "all"
          ? null
          : groups.find((group) => group.url === selectedGroupUrl);
      const scopeText = selectedGroup ? selectedGroup.url : "all tracked groups";
      const confirmed = window.confirm(
        `Start a Bright Data pull for ${scopeText}?`
      );

      if (!confirmed) {
        return;
      }

      const result = await triggerBrightDataSnapshot(
        selectedGroup ? [selectedGroup.url] : null,
        postCount
      );
      updateJob(result.job);
      setMessage(`Started collection for ${scopeText}.`);

      const readyJob = await waitForReadySnapshot(result.job);

      if (readyJob.status !== "ready") {
        setMessage(`Snapshot ended with status ${readyJob.status}.`);
        return;
      }

      await importAndDecodeReadySnapshot(readyJob);
    });

  const checkStatus = () =>
    runAction("status", async () => {
      if (!activeJob?.snapshot_id) return;
      const result = await getBrightDataSnapshotStatus(activeJob.snapshot_id);
      updateJob(result.job);

      if (result.job.status === "ready") {
        await importAndDecodeReadySnapshot(result.job);
      } else {
        setMessage(`Snapshot is ${result.job.status}.`);
      }
    });

  const refreshSnapshotStatuses = () =>
    runAction("refreshJobs", async () => {
      await refreshOpenJobs();
      setMessage("Updated open snapshot statuses.");
    });

  const importSnapshot = () =>
    runAction("import", async () => {
      if (!activeJob?.snapshot_id) return;
      const result = await importBrightDataSnapshot(activeJob.snapshot_id);
      updateJob(result.job);
      await refreshGroupStats();
      setMessage(
        `Imported ${result.import_summary.imported} new, updated ${result.import_summary.updated}, skipped ${result.import_summary.skipped}.`
      );
    });

  const decodeListings = () =>
    runAction("decode", async () => {
      const result = await decodePendingListings(decodeLimit);
      await refreshGroupStats();
      await loadSnapshotProgress();
      const decodeMessage = result.quotaExhausted
        ? "A service quota was exhausted, so decoding paused. Remaining posts are still pending."
        : `Decoded ${result.decoded}, not listings ${result.notListing}, failed ${result.failed}.`;
      setMessage(decodeMessage);
    });

  const resetFailed = () =>
    runAction("reset", async () => {
      const result = await resetFailedDecodes();
      await refreshGroupStats();
      setMessage(`Reset ${result.reset} failed decodes.`);
    });

  return (
    <section className="min-w-0 rounded border border-base-300 bg-base-100 p-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-ink">Bright Data</h1>
        <div className="flex items-center gap-2">
          {pipelineStep && (
            <span className="text-sm text-base-content/60">{pipelineStep}</span>
          )}
          {activeJob && (
            <span className={`badge ${statusTone(activeJob.status)}`}>
              {activeJob.status || "unknown"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_160px_auto_auto_220px]">
        <select
          className="select select-bordered"
          value={selectedGroupUrl}
          onChange={(event) => setSelectedGroupUrl(event.target.value)}
          disabled={!!loadingAction}
        >
          <option value="all">All groups</option>
          {groupRows.map((group) => (
            <option key={group.url} value={group.url}>
              {group.display_name}
            </option>
          ))}
        </select>
        <select
          className="select select-bordered"
          value={postCount}
          onChange={(event) => setPostCount(Number(event.target.value))}
          disabled={!!loadingAction}
          aria-label="Posts per group"
        >
          <option value="10">10 posts</option>
          <option value="25">25 posts</option>
          <option value="50">50 posts</option>
          <option value="75">75 posts</option>
          <option value="100">100 posts</option>
        </select>
        <button
          type="button"
          className="btn btn-primary gap-2"
          onClick={startSnapshot}
          disabled={!!loadingAction}
        >
          {loadingAction === "trigger" ? <span className="loading loading-spinner loading-sm" /> : <Play size={17} />}
          Start collection
        </button>
        <button
          type="button"
          className="btn btn-outline gap-2"
          onClick={() => setShowAddGroup((current) => !current)}
          disabled={!!loadingAction}
          aria-label="Add Facebook group"
        >
          <Plus size={17} />
          Add group
        </button>
        <div className="flex gap-2">
          <select
            className="select select-bordered w-24"
            value={decodeLimit}
            onChange={(event) => setDecodeLimit(Number(event.target.value))}
            aria-label="Decode batch size"
            disabled={!!loadingAction}
          >
            <option value="1">1</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
          </select>
          <button
            type="button"
            className="btn btn-accent flex-1 gap-2"
            onClick={decodeListings}
            disabled={!!loadingAction}
          >
            {loadingAction === "decode" ? <span className="loading loading-spinner loading-sm" /> : <WandSparkles size={17} />}
            Continue decoding
          </button>
        </div>
      </div>

      {showAddGroup && (
        <div className="mt-3 grid gap-3 rounded bg-base-200 p-3 md:grid-cols-[1fr_auto]">
          <input
            className="input input-bordered"
            value={newGroupUrl}
            onChange={(event) => setNewGroupUrl(event.target.value)}
            placeholder="Paste Facebook group link"
            disabled={!!loadingAction}
          />
          <button
            type="button"
            className="btn btn-secondary gap-2"
            onClick={saveGroup}
            disabled={!newGroupUrl.trim() || !!loadingAction}
          >
            {loadingAction === "addGroup" ? <span className="loading loading-spinner loading-sm" /> : <Plus size={17} />}
            Save group
          </button>
        </div>
      )}

      <div className="mt-3 rounded bg-base-200 p-3">
        <button
          type="button"
          className="btn btn-ghost btn-sm gap-2"
          onClick={() => setShowAdvanced((current) => !current)}
        >
          <Wrench size={16} />
          Advanced recovery
        </button>
        {showAdvanced && (
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <button
              type="button"
              className="btn btn-outline gap-2"
              onClick={checkStatus}
              disabled={!activeJob?.snapshot_id || !!loadingAction}
            >
              {loadingAction === "status" ? <span className="loading loading-spinner loading-sm" /> : <RefreshCw size={17} />}
              Check selected
            </button>
            <button
              type="button"
              className="btn btn-outline gap-2"
              onClick={refreshSnapshotStatuses}
              disabled={!!loadingAction}
            >
              {loadingAction === "refreshJobs" ? <span className="loading loading-spinner loading-sm" /> : <RefreshCw size={17} />}
              Refresh open
            </button>
            <button
              type="button"
              className="btn btn-secondary gap-2"
              onClick={importSnapshot}
              disabled={activeJob?.status !== "ready" || !!loadingAction}
            >
              {loadingAction === "import" ? <span className="loading loading-spinner loading-sm" /> : <CloudDownload size={17} />}
              Import ready snapshot
            </button>
            <button
              type="button"
              className="btn btn-ghost gap-2"
              onClick={resetFailed}
              disabled={!!loadingAction}
            >
              {loadingAction === "reset" ? <span className="loading loading-spinner loading-sm" /> : null}
              Retry failed OpenAI decodes
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className="alert mt-5 rounded">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      <div className="mt-5 grid min-w-0 gap-4">
        <div className="min-w-0 overflow-hidden rounded bg-base-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Groups</h2>
            <button
              type="button"
              className="btn btn-outline btn-sm gap-2"
              onClick={() => runAction("stats", refreshGroupStats)}
              disabled={!!loadingAction}
            >
              {loadingAction === "stats" ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <RefreshCw size={15} />
              )}
              Refresh stats
            </button>
          </div>
          <div className="mt-3 w-full min-w-0 overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Raw</th>
                  <th>Decoded</th>
                  <th>Pending</th>
                  <th>Failed</th>
                  <th>Date range</th>
                  <th>Missing</th>
                  <th>Imported</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((group) => (
                  <tr key={group.url}>
                    <td>
                      <div className="max-w-64 truncate" title={group.url}>
                        {group.display_name}
                      </div>
                      {group.display_name === "Group name unavailable" && (
                        <div className="max-w-64 truncate text-xs text-base-content/50">
                          {group.url}
                        </div>
                      )}
                    </td>
                    <td>{group.raw_posts ?? "-"}</td>
                    <td>{group.decoded ?? "-"}</td>
                    <td>{group.pending ?? "-"}</td>
                    <td>{group.failed ?? "-"}</td>
                    <td>
                      <div>{formatDateTime(group.first_posted_at)}</div>
                      <div className="text-xs text-base-content/50">
                        to {formatDateTime(group.latest_posted_at)}
                      </div>
                    </td>
                    <td>
                      <div>{group.missing_dates || 0} dates</div>
                      <div className="text-xs text-base-content/50">
                        {group.missing_times || 0} times
                      </div>
                    </td>
                    <td>{formatDateTime(group.latest_imported_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 rounded bg-base-200 p-4">
          <h2 className="font-semibold text-ink">Snapshots</h2>
          <div className="mt-3 grid max-h-96 gap-2 overflow-y-auto pr-1">
            {jobs.length === 0 && <p className="text-sm text-base-content/60">None</p>}
            {jobs.map((job) => (
              <button
                key={job.snapshot_id}
                type="button"
                className="rounded bg-base-100 p-3 text-left text-sm hover:outline hover:outline-1 hover:outline-primary"
                onClick={() => {
                  setActiveJob(job);
                  loadSnapshotProgress(job);
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">
                    {jobGroupLabel(job, groups.length, groupStats)}
                  </span>
                  <span className={`badge badge-sm ${statusTone(job.status)}`}>{job.status}</span>
                </div>
                <div className="mt-1 text-xs text-base-content/50">
                  {job.snapshot_id} · {formatDateTime(job.created_at)}
                </div>
                {snapshotDetail(job) && (
                  <div className="mt-1 text-xs text-base-content/50">
                    {snapshotDetail(job)}
                  </div>
                )}
                {formatDecodeProgress(snapshotProgress[job.snapshot_id]) && (
                  <div className="mt-1 text-xs font-medium text-base-content/70">
                    {formatDecodeProgress(snapshotProgress[job.snapshot_id])}
                  </div>
                )}
                {jobGroupDetail(job, groupStats) && (
                  <div
                    className="mt-1 truncate text-xs text-base-content/60"
                    title={jobGroupDetail(job, groupStats)}
                  >
                    {jobGroupDetail(job, groupStats)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <TimelineChart
          timeline={timeline}
          isLoading={loadingAction === "timeline"}
          onRefresh={refreshTimeline}
        />
      </div>
    </section>
  );
}
