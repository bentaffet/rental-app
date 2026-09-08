import { Home } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-base-100">
      <header className="border-b border-base-300 bg-base-100">
        <div className="page-shell flex h-14 items-center justify-between">
          <NavLink to="/start" className="flex items-center gap-2 font-bold text-ink">
            <Home size={20} />
            <span>RoomUp!</span>
          </NavLink>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
