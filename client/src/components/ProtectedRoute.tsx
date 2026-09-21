import { Navigate, Outlet } from "react-router-dom";

/**
 * ============================================================================
 * PROTECTED ROUTE COMPONENT (ProtectedRoute.tsx)
 * ============================================================================
 * PURPOSE:
 * Serves as a client-side navigation security guard.
 * It prevents unauthenticated users or users with incorrect roles from viewing
 * sensitive staff and admin interfaces.
 * 
 * HOW IT WORKS:
 * 1. Checks localStorage for the presence of a valid JWT "token" and "user" profile.
 * 2. If missing, bounces the visitor immediately to "/login".
 * 3. If "allowedRoles" are provided (e.g. ['Cashier', 'Admin']), it verifies
 *    whether the user's role is permitted. If not permitted, redirects to login.
 * 4. If all checks pass, renders `<Outlet />` allowing child routes to render.
 * ============================================================================
 */

interface ProtectedRouteProps {
  /** Array of permitted role names, e.g. ["Admin"], ["Cashier", "Admin"], or ["Kitchen", "Admin"] */
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  // Step 1: Retrieve authentication credentials persisted during login
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  // Step 2: Unauthenticated check - if user is not logged in, redirect to login page
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Step 3: Role check - verify whether the logged-in role has permission for this route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized (e.g. Kitchen staff attempting to access Admin backoffice), kick back to login
    return <Navigate to="/login" replace />;
  }

  // Step 4: Authorization successful - render child route component via React Router Outlet
  return <Outlet />;
}
