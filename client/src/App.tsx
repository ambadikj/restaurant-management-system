import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Employees from "./pages/Employees";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes for Admins */}
        <Route
          path="/admin"
          element={<ProtectedRoute allowedRoles={["Admin"]} />}
        >
          {/* Index route: /admin */}
          <Route index element={<AdminDashboard />} />
          {/* Employee route: /admin/employees */}
          <Route path="employees" element={<Employees />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
