import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";

export function PublicOnlyRoute() {
  const { user, hasCompletedOnboarding } = useAuth();

  if (!user) {
    return <Outlet />;
  }

  return (
    <Navigate
      to={hasCompletedOnboarding ? "/listings" : "/onboarding"}
      replace
    />
  );
}

export function ProtectedRoute() {
  const { user, hasCompletedOnboarding } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/start" replace state={{ from: location }} />;
  }

  if (!hasCompletedOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
