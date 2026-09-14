import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../auth/useAuth.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submitLogin(event) {
    event.preventDefault();
    setError("");

    try {
      const user = login({ email, password });
      const fallback = user.preferences ? "/listings" : "/onboarding";
      navigate(location.state?.from?.pathname || fallback, { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    }
  }

  return (
    <div className="page-shell grid min-h-[calc(100vh-56px)] place-items-center py-10">
      <section className="w-full max-w-md rounded border border-base-300 bg-base-100 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-ink">Log in</h1>
        {location.state?.message && (
          <div className="alert alert-success mt-4 rounded">
            <span>{location.state.message}</span>
          </div>
        )}
        <form className="mt-6 grid gap-4" onSubmit={submitLogin}>
          <label className="form-control">
            <span className="label-text mb-1">Email</span>
            <input
              className="input input-bordered"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Password</span>
            <input
              className="input input-bordered"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="text-sm text-error">{error}</p>}

          <button type="submit" className="btn btn-primary">
            <LogIn size={18} />
            Log in
          </button>
        </form>

        <p className="mt-5 text-sm text-base-content/70">
          New here?{" "}
          <Link className="font-semibold text-primary" to="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </div>
  );
}
