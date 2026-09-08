import { ArrowRight, Home, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

export default function Start() {
  return (
    <div className="page-shell grid min-h-[calc(100vh-56px)] place-items-center py-10">
      <section className="w-full max-w-xl rounded border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded bg-primary text-primary-content">
            <Home size={23} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Welcome to RoomUp!</h1>
            <p className="text-sm text-base-content/65">
              Sign in or create an account to start browsing rentals.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link to="/login" className="btn btn-primary">
            <LogIn size={18} />
            Log in
          </Link>
          <Link to="/signup" className="btn btn-outline">
            Sign up
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
