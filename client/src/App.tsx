import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import MenuInventory from "./pages/admin/MenuInventory";
import Employees from "./pages/admin/Employees";
import TablesQR from "./pages/admin/TablesQR";
import Reports from "./pages/admin/Reports";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <TooltipProvider delayDuration={0}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes wrapped in Sidebar Layout */}
          <Route
            path="/admin"
            element={<ProtectedRoute allowedRoles={["Admin"]} />}
          >
            <Route element={<AdminLayout />}>
              {/* Default Admin Route redirects to Menu & Inventory */}
              <Route index element={<Navigate to="/admin/menu" replace />} />

              {/* 1. Menu & Auto-86 */}
              <Route path="menu" element={<MenuInventory />} />

              {/* 3. Staff & RBAC */}
              <Route path="employees" element={<Employees />} />

              {/* 4. QR Endpoints & Hardware */}
              <Route path="tables" element={<TablesQR />} />

              {/* 5. EOD & Reviews */}
              <Route path="reports" element={<Reports />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </TooltipProvider>
  );
}

export default App;