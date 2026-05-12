import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./landingPage/pages/Home";
import Navbar from "./common/Navbar";
import { Toaster } from 'react-hot-toast';
import AuthPage from "./landingPage/Auth/AuthPage";
import Landing from "./landingPage/pages/Landing";
import AdminStationForm from "./landingPage/admin/AdminStationForm";
import UserProfile from "./landingPage/pages/UserProfile";
import Footer from "./common/Footer";
import AdminLayout from "./landingPage/admin/AdminLayout";
import AdminDashboard from "./landingPage/admin/AdminDashboard";
import AdminStations from "./landingPage/admin/AdminStations";
import AdminUsers from "./landingPage/admin/AdminUsers";
import AdminSessions from "./landingPage/admin/AdminSessions";
import AdminAlerts from "./landingPage/admin/AdminAlerts";
import OwnerLayout from "./landingPage/owner/OwnerLayout";
import OwnerDashboard from "./landingPage/owner/OwnerDashboard";
import OwnerStations from "./landingPage/owner/OwnerStations";
import OwnerOperations from "./landingPage/owner/OwnerOperations";
import OwnerAnalytics from "./landingPage/owner/OwnerAnalytics";

import { connectSocket } from "./socket";

function getStoredAuth() {
  const token = localStorage.getItem("token");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }
  return { token, user };
}

function roleHome(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "owner") return "/owner/dashboard";
  return "/home";
}

function RequireAuth({ children, roles }) {
  const location = useLocation();
  const { token, user } = getStoredAuth();
  const role = user?.role;

  if (!token || !user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(role)) {
    return <Navigate to={roleHome(role)} replace />;
  }

  return children;
}

function GuestOnly({ children }) {
  const { token, user } = getStoredAuth();
  if (token && user) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isOwner = location.pathname.startsWith('/owner');
  const isConsole = isAdmin || isOwner;

  return (
    <>
      {!isConsole && <Navbar />}
      <div className={isConsole ? "min-h-screen" : "pt-24 min-h-[calc(100vh-80px)]"}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<RequireAuth roles={["user"]}><Home /></RequireAuth>} />
          <Route path="/auth" element={<GuestOnly><AuthPage /></GuestOnly>} />
          <Route path="/profile" element={<RequireAuth roles={["user"]}><UserProfile /></RequireAuth>} />

          {/* Admin routes nested under AdminLayout */}
          <Route path="/admin" element={<RequireAuth roles={["admin"]}><AdminLayout /></RequireAuth>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="stations" element={<AdminStations />} />
            <Route path="stations/new" element={<AdminStationForm />} />
            <Route path="stations/:id/edit" element={<AdminStationForm />} />
            <Route path="chargers" element={<AdminStations />} />
            <Route path="sessions" element={<AdminSessions />} />
            <Route path="analytics" element={<AdminDashboard />} />
            <Route path="alerts" element={<AdminAlerts />} />
            <Route path="settings" element={<AdminDashboard />} />
          </Route>

          <Route path="/owner" element={<RequireAuth roles={["owner"]}><OwnerLayout /></RequireAuth>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OwnerDashboard />} />
            <Route path="stations" element={<OwnerStations />} />
            <Route path="stations/new" element={<AdminStationForm />} />
            <Route path="stations/:id/edit" element={<AdminStationForm />} />
            <Route path="operations" element={<OwnerOperations />} />
            <Route path="analytics" element={<OwnerAnalytics />} />
          </Route>

          {/* agar user unauthorized route pe jaye */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {!isConsole && <Footer />}
    </>
  );
}

export default function App() {
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (token && user) {
      connectSocket(token, user);
    }
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <AppContent />
    </BrowserRouter>
  );
}
