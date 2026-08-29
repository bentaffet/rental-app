import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import Listings from "./pages/Listings.jsx";
import Data from "./pages/Data.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Listings />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/data" element={<Data />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
