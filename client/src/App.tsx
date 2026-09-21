import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import CustomerMenu from "./pages/customer/CustomerMenu";
import MenuInventory from "./pages/admin/MenuInventory";
import Employees from "./pages/admin/Employees";
import TablesQR from "./pages/admin/TablesQR";
import Reports from "./pages/admin/Reports";
import KitchenDashboard from "./pages/kitchen/KitchenDashboard";
import CashierDashboard from "./pages/cashier/CashierDashboard";
import WaiterDashboard from "./pages/waiter/WaiterDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * ============================================================================
 * MAIN APPLICATION ROUTER (App.tsx)
 * ============================================================================
 * PURPOSE:
 * This is the central routing hub of the frontend application.
 * It defines every URL path in the system, determines which React component
 * renders, and enforces Role-Based Access Control (RBAC) via ProtectedRoute.
 * ============================================================================
 */
function App() {
  return (
    // TooltipProvider: Provides tooltip UI context globally with zero delay
    <TooltipProvider delayDuration={0}>
      <Router>
        <Routes>
          {/* Default Root: Automatically redirects visitors to the /login page */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 1. PUBLIC AUTHENTICATION: Staff login page (Admin, Cashier, Kitchen) */}
          <Route path="/login" element={<Login />} />

          {/* 2. PUBLIC CUSTOMER PORTAL (QR Landing Page):
              - Scanned by diners via table acrylic standees (e.g. /menu?table=1&token=xyz)
              - Allows browsing categories, adding items to cart, and placing orders */}
          <Route path="/menu" element={<CustomerMenu />} />
          <Route path="/customer" element={<Navigate to="/menu" replace />} />

          {/* 3. PUBLIC WAITER PORTAL:
              - Used on floor tablets/mobile devices by waitstaff
              - View table occupancy, take orders manually, and receive call-waiter alerts */}
          <Route path="/waiter" element={<WaiterDashboard />} />

          {/* 4. PROTECTED CASHIER POS MODULE:
              - Guarded: Only accessible if logged in as "Cashier" or "Admin"
              - Features real-time floor plan, dining session billing, and payment processing */}
          <Route
            path="/cashier"
            element={<ProtectedRoute allowedRoles={["Cashier", "Admin"]} />}
          >
            <Route element={<AdminLayout />}>
              <Route index element={<CashierDashboard />} />
            </Route>
          </Route>

          {/* 5. PROTECTED KITCHEN DISPLAY SYSTEM (KDS):
              - Guarded: Only accessible if logged in as "Kitchen" or "Admin"
              - Shows live digital order tickets (KOT) with real-time audio and status updates */}
          <Route
            path="/kitchen"
            element={<ProtectedRoute allowedRoles={["Kitchen", "Admin"]} />}
          >
            <Route index element={<KitchenDashboard />} />
          </Route>

          {/* 6. PROTECTED ADMIN BACKOFFICE PORTAL:
              - Guarded: Strictly restricted to "Admin" role only
              - Wrapped in AdminLayout (collapsible sidebar + top status header) */}
          <Route
            path="/admin"
            element={<ProtectedRoute allowedRoles={["Admin"]} />}
          >
            <Route element={<AdminLayout />}>
              {/* Default Admin Route: Automatically redirects to Menu & Inventory */}
              <Route index element={<Navigate to="/admin/menu" replace />} />

              {/* Module 6.1: Menu Management & Auto-86 Stock Tracking */}
              <Route path="menu" element={<MenuInventory />} />

              {/* Module 6.2: Staff Management & Role-Based Access Control (RBAC) */}
              <Route path="employees" element={<Employees />} />

              {/* Module 6.3: Floor Plan, Table Management & Printable QR Standees */}
              <Route path="tables" element={<TablesQR />} />

              {/* Module 6.4: End-of-Day (EOD) Financial Reports & Customer Reviews */}
              <Route path="reports" element={<Reports />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </TooltipProvider>
  );
}

export default App;