import { useEffect, useState } from "react";
import { CheckCircle2, CloudDownload, Play, RefreshCw, WandSparkles } from "lucide-react";
import {
  decodePendingListings,
  getBrightDataJobs,
  getBrightDataSnapshotStatus,
  getGroupStats,
  getTrackedGroups,
  importBrightDataSnapshot,
  resetFailedDecodes,
  triggerBrightDataSnapshot,
} from "../utils/apiClient.js";

function statusTone(status) {
  if (status === "ready") return "badge-success";
  if (status === "failed" || status === "canceled") return "badge-error";
  if (status === "running" || status === "starting") return "badge-warning";
  return "badge-ghost";
}

export default function PipelineTester() {
  const [groups, setGroups] = useState([]);
  const [groupStats, setGroupStats] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [decodeLimit, setDecodeLimit] = useState(5);

  useEffect(() => {
    Promise.all([getTrackedGroups(), getBrightDataJobs(), getGroupStats()])
      .then(([groupResult, jobResult, statsResult]) => {
        setGroups(groupResult.groups || []);
        setJobs(jobResult.jobs || []);
        setGroupStats(statsResult.groups || []);
        setActiveJob(jobResult.jobs?.[0] || null);
      })
      .catch((error) => setMessage(error.message));
  }, []);

  async function refreshGroupStats() {
    const result = await getGroupStats();
    setGroupStats(result.groups || []);
  }

  async function runAction(actionName, action) {
    setLoadingAction(actionName);
    setMessage("");

    try {
      await action();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingAction("");
    }
  }

  function updateJob(job) {
    setActiveJob(job);
    setJobs((current) => {
      const others = current.filter((item) => item.snapshot_id !== job.snapshot_id);
      return [job, ...others];
    });
  }

  const startSnapshot = () =>
    runAction("trigger", async () => {
      const confirmed = window.confirm(
        "Start a Bright Data pull for the three tracked groups?"
      );

      if (!confirmed) {
        return;
      }

      const result = await triggerBrightDataSnapshot();
      updateJob(result.job);
      setMessage(`Started snapshot ${result.job.snapshot_id}.`);
    });

  const checkStatus = () =>
    runAction("status", async () => {
      if (!activeJob?.snapshot_id) return;
      const result = await getBrightDataSnapshotStatus(activeJob.snapshot_id);
      updateJob(result.job);
      setMessage(`Snapshot is ${result.job.status}.`);
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
        {activeJob && (
          <span className={`badge ${statusTone(activeJob.status)}`}>
            {activeJob.status || "unknown"}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
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

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
                  <th>Other</th>
                </tr>
              </thead>
              <tbody>
                {(groupStats.length ? groupStats : groups).map((group) => (
                  <tr key={group.url}>
                    <td>
                      <div className="max-w-64 truncate" title={group.url}>
                        {group.url}
                      </div>
                      <div className="text-xs text-base-content/50">
                        {group.requested_posts || group.num_of_posts} posts
                      </div>
                    </td>
                    <td>{group.raw_posts ?? "-"}</td>
                    <td>{group.decoded ?? "-"}</td>
                    <td>{group.pending ?? "-"}</td>
                    <td>{group.failed ?? "-"}</td>
                    <td>{(group.not_listing ?? 0) + (group.decoding ?? 0) + (group.other ?? 0) || "-"}</td>
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
      </div>
    </section>
  );
}
