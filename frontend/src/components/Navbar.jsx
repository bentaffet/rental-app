import { NavLink } from "react-router-dom";
import { Database, Home, Search } from "lucide-react";

const links = [
  { to: "/listings", label: "Listings", icon: Search },
  { to: "/data", label: "Data", icon: Database },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-base-300 bg-base-100">
      <div className="page-shell flex h-14 items-center justify-between gap-4">
        <NavLink to="/listings" className="flex items-center gap-2 font-bold text-ink">
          <Home size={20} />
          <span>LeaseLens</span>
        </NavLink>

        <nav className="flex gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `btn btn-sm gap-2 ${isActive ? "btn-primary" : "btn-ghost"}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
