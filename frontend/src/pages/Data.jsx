import { useState } from "react";
import PipelineTester from "../components/PipelineTester.jsx";

const DATA_PASSWORD = "data!";
const DATA_UNLOCK_KEY = "leaselens:data-unlocked";

export default function Data() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(
    () => window.sessionStorage.getItem(DATA_UNLOCK_KEY) === "true"
  );

  function submitPassword(event) {
    event.preventDefault();

    if (password !== DATA_PASSWORD) {
      setError("Wrong password");
      return;
    }

    window.sessionStorage.setItem(DATA_UNLOCK_KEY, "true");
    setUnlocked(true);
    setError("");
  }

  if (!unlocked) {
    return (
      <div className="page-shell py-6">
        <section className="mx-auto max-w-sm rounded border border-base-300 bg-base-100 p-5">
          <h1 className="text-xl font-semibold text-ink">Data</h1>
          <form className="mt-5 grid gap-3" onSubmit={submitPassword}>
            <input
              className="input input-bordered"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              autoFocus
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <button type="submit" className="btn btn-primary">
              Unlock
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell py-6">
      <PipelineTester />
    </div>
  );
}
