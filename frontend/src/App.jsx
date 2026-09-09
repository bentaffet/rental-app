import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import AuthLayout from "./components/AuthLayout.jsx";
import AppLayout from "./components/AppLayout.jsx";
import { ProtectedRoute, PublicOnlyRoute } from "./routes/AuthRoutes.jsx";
import Listings from "./pages/Listings.jsx";
import ListingDetails from "./pages/ListingDetails.jsx";
import Data from "./pages/Data.jsx";
import Login from "./pages/Login.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Signup from "./pages/Signup.jsx";
import Start from "./pages/Start.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/start" element={<Start />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/listings" replace />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/listings/:listingId" element={<ListingDetails />} />
            <Route path="/data" element={<Data />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
