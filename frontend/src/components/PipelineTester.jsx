import { useEffect, useState } from "react";
import { CheckCircle2, CloudDownload, Play, RefreshCw, WandSparkles } from "lucide-react";
import {
  decodePendingListings,
  getBrightDataJobs,
  getBrightDataSnapshotStatus,
  getGroupStats,
  getPostTimeline,
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

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function TimelineChart({ timeline }) {
  const buckets = timeline?.buckets || [];
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <div className="rounded bg-base-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Post timeline</h2>
        <div className="text-sm text-base-content/60">
          {timeline?.dated_posts || 0} dated · {timeline?.missing_dates || 0} missing dates ·{" "}
          {timeline?.missing_times || 0} missing times
        </div>
      </div>

      {buckets.length === 0 ? (
        <p className="mt-3 text-sm text-base-content/60">No dated posts yet</p>
      ) : (
        <div className="mt-4 max-w-full overflow-x-auto px-3 pb-2">
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
  const [selectedGroupUrl, setSelectedGroupUrl] = useState("all");
  const [timeline, setTimeline] = useState(null);
  const [pipelineStep, setPipelineStep] = useState("");

  useEffect(() => {
    Promise.all([getTrackedGroups(), getBrightDataJobs(), getGroupStats(), getPostTimeline()])
      .then(([groupResult, jobResult, statsResult, timelineResult]) => {
        setGroups(groupResult.groups || []);
        setJobs(jobResult.jobs || []);
        setGroupStats(statsResult.groups || []);
        setTimeline(timelineResult.timeline || null);
        setActiveJob(jobResult.jobs?.[0] || null);
      })
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    const groupUrl = selectedGroupUrl === "all" ? "" : selectedGroupUrl;

    getPostTimeline(groupUrl)
      .then((result) => setTimeline(result.timeline || null))
      .catch((error) => setMessage(error.message));
  }, [selectedGroupUrl]);

  async function refreshGroupStats() {
    const groupUrl = selectedGroupUrl === "all" ? "" : selectedGroupUrl;
    const [statsResult, timelineResult] = await Promise.all([
      getGroupStats(),
      getPostTimeline(groupUrl),
    ]);
    setGroupStats(statsResult.groups || []);
    setTimeline(timelineResult.timeline || null);
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

  async function decodeUntilClear() {
    let totalDecoded = 0;
    let totalNotListings = 0;
    let totalFailed = 0;
    let batches = 0;

    while (batches < 20) {
      setPipelineStep(`Decoding batch ${batches + 1}`);
      const result = await decodePendingListings(decodeLimit);

      totalDecoded += result.decoded || 0;
      totalNotListings += result.notListing || 0;
      totalFailed += result.failed || 0;
      batches += 1;

      if (!result.found || result.found < decodeLimit) {
        break;
      }
    }

    return {
      decoded: totalDecoded,
      notListing: totalNotListings,
      failed: totalFailed,
      batches,
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
    setMessage(
      `Imported ${importResult.import_summary.imported} new, updated ${importResult.import_summary.updated}, skipped ${importResult.import_summary.skipped}. Decoded ${decodeResult.decoded}, not listings ${decodeResult.notListing}, failed ${decodeResult.failed}.`
    );
  }

  async function waitForReadySnapshot(job) {
    let currentJob = job;

    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (["ready", "failed", "canceled"].includes(currentJob.status)) {
        return currentJob;
      }

      setPipelineStep(`Waiting for Bright Data (${attempt + 1})`);
      await sleep(5000);

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
        selectedGroup ? [selectedGroup.url] : []
      );
      updateJob(result.job);
      setMessage(`Started snapshot ${result.job.snapshot_id} for ${scopeText}.`);

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
      setMessage(
        `Decoded ${result.decoded}, not listings ${result.notListing}, failed ${result.failed}.`
      );
    });

  const resetFailed = () =>
    runAction("reset", async () => {
      const result = await resetFailedDecodes();
      await refreshGroupStats();
      setMessage(`Reset ${result.reset} failed decodes.`);
    });

  return (
    <section className="rounded border border-base-300 bg-base-100 p-5">
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

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <select
          className="select select-bordered"
          value={selectedGroupUrl}
          onChange={(event) => setSelectedGroupUrl(event.target.value)}
          disabled={!!loadingAction}
        >
          <option value="all">All groups</option>
          {groups.map((group) => (
            <option key={group.url} value={group.url}>
              {group.url.replace("https://www.facebook.com/groups/", "")}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary gap-2"
          onClick={startSnapshot}
          disabled={!!loadingAction}
        >
          {loadingAction === "trigger" ? <span className="loading loading-spinner loading-sm" /> : <Play size={17} />}
          Start
        </button>
        <button
          type="button"
          className="btn btn-outline gap-2"
          onClick={checkStatus}
          disabled={!activeJob?.snapshot_id || !!loadingAction}
        >
          {loadingAction === "status" ? <span className="loading loading-spinner loading-sm" /> : <RefreshCw size={17} />}
          Status
        </button>
        <button
          type="button"
          className="btn btn-secondary gap-2"
          onClick={importSnapshot}
          disabled={activeJob?.status !== "ready" || !!loadingAction}
        >
          {loadingAction === "import" ? <span className="loading loading-spinner loading-sm" /> : <CloudDownload size={17} />}
          Import
        </button>
        <div className="flex gap-2">
          <select
            className="select select-bordered w-20"
            value={decodeLimit}
            onChange={(event) => setDecodeLimit(Number(event.target.value))}
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
            Decode
          </button>
        </div>
        <button
          type="button"
          className="btn btn-ghost gap-2"
          onClick={resetFailed}
          disabled={!!loadingAction}
        >
          {loadingAction === "reset" ? <span className="loading loading-spinner loading-sm" /> : null}
          Reset failed
        </button>
      </div>

      {message && (
        <div className="alert mt-5 rounded">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      <div className="mt-5 grid gap-4">
        <div className="rounded bg-base-200 p-4">
          <h2 className="font-semibold text-ink">Groups</h2>
          <div className="mt-3 overflow-x-auto">
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
                {(groupStats.length ? groupStats : groups).map((group) => (
                  <tr key={group.url}>
                    <td>
                      <div className="max-w-64 truncate" title={group.url}>
                        {group.group_name || group.url}
                      </div>
                      <div className="text-xs text-base-content/50">
                        {group.group_id ? `${group.group_id} · ` : ""}
                        {group.requested_posts || group.num_of_posts} requested
                      </div>
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

        <div className="rounded bg-base-200 p-4">
          <h2 className="font-semibold text-ink">Snapshots</h2>
          <div className="mt-3 grid gap-2">
            {jobs.length === 0 && <p className="text-sm text-base-content/60">None</p>}
            {jobs.slice(0, 4).map((job) => (
              <button
                key={job.snapshot_id}
                type="button"
                className="rounded bg-base-100 p-3 text-left text-sm hover:outline hover:outline-1 hover:outline-primary"
                onClick={() => setActiveJob(job)}
              >
                <span className="font-medium text-ink">{job.snapshot_id}</span>
                <span className={`badge badge-sm ml-2 ${statusTone(job.status)}`}>{job.status}</span>
              </button>
            ))}
          </div>
        </div>

        <TimelineChart timeline={timeline} />
      </div>
    </section>
  );
}
