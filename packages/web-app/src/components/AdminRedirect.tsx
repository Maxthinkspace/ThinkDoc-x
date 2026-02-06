import { Navigate, useLocation } from "react-router-dom";

export function AdminRedirect() {
  const location = useLocation();
  // Remove /admin prefix and add /dashboard/admin prefix
  const path = location.pathname.replace('/admin', '');
  return <Navigate to={`/dashboard/admin${path}`} replace />;
}

