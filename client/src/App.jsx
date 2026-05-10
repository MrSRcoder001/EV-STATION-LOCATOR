import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

import { connectSocket } from "./socket";

import { useLocation } from "react-router-dom";

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && <Navbar />}
      <div className={isAdmin ? "min-h-screen" : "pt-24 min-h-[calc(100vh-80px)]"}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<UserProfile />} />

          {/* Admin routes nested under AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
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

          {/* agar user unauthorized route pe jaye */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {!isAdmin && <Footer />}
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
