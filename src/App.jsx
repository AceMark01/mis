import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTodayTasks from "./pages/admin/TodayTasks";
import AdminPendingTasks from "./pages/admin/PendingTasks";
import KpiKra from "./pages/admin/KpiKra";
import UserDashboard from "./pages/user/Dashboard";
import Commitment from "./pages/admin/Commitment";
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import UserKpiKra from './pages/user/UserKpiKra';
import HistoryCommitment from "./pages/admin/HistoryCommitment";
import UserKpiKraTable from "./pages/user/UserKpiKraTable";
import History from "./pages/admin/History";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="today-tasks" element={<AdminTodayTasks />} />
        <Route path="pending-tasks" element={<AdminPendingTasks />} />
        <Route path="commitment" element={<Commitment />} />
        <Route path="kpi-kra" element={<KpiKra />} />
        <Route path="history-commitment" element={<HistoryCommitment />} />
        <Route path="history" element={<History />} />

      </Route>

      {/* User Routes */}
      <Route
        path="/user"
        element={
          <ProtectedRoute role="user">
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/user/dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
         <Route path="kpi-kra" element={<UserKpiKra />} />
           <Route path="kpi-kra-table" element={<UserKpiKraTable />} /> 
      </Route>

      <Route
        path="/"
        element={
          <Navigate
            to={user ? (user.role === "admin" ? "/admin" : "/user") : "/login"}
            replace
          />
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;