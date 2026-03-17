import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./landingPage/pages/Home";
import Navbar from "./common/Navbar";
import { Toaster } from 'react-hot-toast';
import AuthPage from "./landingPage/Auth/AuthPage";
import Landing from "./landingPage/pages/Landing";
import OwnerLayout from "./landingPage/owner/OwnerLayout";
import StationForm from "./landingPage/owner/StationForm";
import StationList from "./landingPage/owner/StationList";
import OwnerBookings from "./landingPage/owner/OwnerBookings";
import StationSlots from "./landingPage/component/StationSlots";
// import MyBookings from "./landingPage/pages/BookingList"; // REMOVED
import OwnerProfile from "./landingPage/owner/OwnerProfile";
import UserProfile from "./landingPage/pages/UserProfile";
import Footer from "./common/Footer";

import { connectSocket } from "./socket";

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
      <Navbar />
      <div className="pt-24 min-h-[calc(100vh-80px)]">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<UserProfile />} />

          {/* Owner routes nested under OwnerLayout */}
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StationList />} />
            <Route path="bookings" element={<OwnerBookings />} />
            <Route path="profile" element={<OwnerProfile />} />
            <Route path="slots" element={<StationSlots />} />
            <Route path="stations" element={<StationList />} />
            <Route path="stations/new" element={<StationForm />} />
            <Route path="stations/:id/edit" element={<StationForm />} />
          </Route>

          {/* agar user unauthorized route pe jaye */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      <Footer />
    </BrowserRouter>
  );
}
