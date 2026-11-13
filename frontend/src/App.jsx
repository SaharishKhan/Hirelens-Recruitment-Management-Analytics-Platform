import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import JobDrives from "./pages/JobDrives";
import Candidates from "./pages/Candidates";

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-50">

      <Sidebar />

      <div className="min-h-screen md:ml-64">

        <Navbar />

        <main>
          <Outlet />
        </main>

      </div>

    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading HireLens AI...
      </div>
    );
  }

  return (
    <Routes>

      <Route
        path="/"
        element={
          <Navigate
            to={user ? "/dashboard" : "/login"}
            replace
          />
        }
      />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>

        <Route element={<DashboardLayout />}>

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/companies"
            element={<Companies />}
          />
          <Route 
            path="/job-drives" 
            element={<JobDrives />} 
          />
          <Route 
            path="/candidates" 
            element={<Candidates />} 
          />

        </Route>
        <Route 
        path="/candidates" element={<Candidates />} />

      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>

      <AuthProvider>
        <AppRoutes />
      </AuthProvider>

    </BrowserRouter>
  );
}

export default App;