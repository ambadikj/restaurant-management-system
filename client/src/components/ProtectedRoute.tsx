import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  // 1. If no token, redirect to login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. If the user's role isn't in the allowed list, redirect them
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // You can redirect to a generic "Not Authorized" page or back to login
    return <Navigate to="/login" replace />;
  }

  // 3. If everything is good, render the child routes
  return <Outlet />;
}
