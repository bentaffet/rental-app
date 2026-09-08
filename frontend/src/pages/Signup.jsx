import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useAuth } from "../auth/useAuth.js";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRetype, setPasswordRetype] = useState("");
  const [error, setError] = useState("");

  function submitSignup(event) {
    event.preventDefault();
    setError("");

    if (password !== passwordRetype) {
      setError("Passwords do not match.");
      return;
    }

    try {
      signup({ email, password });
      navigate("/login", {
        replace: true,
        state: { message: "Account created. Log in to continue." },
      });
    } catch (signupError) {
      setError(signupError.message);
    }
  }

  return (
    <div className="page-shell grid min-h-[calc(100vh-56px)] place-items-center py-10">
      <section className="w-full max-w-md rounded border border-base-300 bg-base-100 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-ink">Sign up</h1>
        <form className="mt-6 grid gap-4" onSubmit={submitSignup}>
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
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Retype password</span>
            <input
              className="input input-bordered"
              type="password"
              value={passwordRetype}
              onChange={(event) => setPasswordRetype(event.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          {error && <p className="text-sm text-error">{error}</p>}

          <button type="submit" className="btn btn-primary">
            <UserPlus size={18} />
            Create account
          </button>
        </form>

        <p className="mt-5 text-sm text-base-content/70">
          Already have an account?{" "}
          <Link className="font-semibold text-primary" to="/login">
            Log in
          </Link>
        </p>
      </section>
    </div>
  );
}
