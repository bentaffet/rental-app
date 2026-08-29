import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-base-100">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
