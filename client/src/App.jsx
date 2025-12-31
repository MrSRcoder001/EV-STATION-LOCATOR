import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./landingPage/pages/Home";
import Navbar from "./common/Navbar";
import AuthPage from "./landingPage/Auth/AuthPage";
import Landing from "./landingPage/pages/Landing";
import OwnerLayout from "./landingPage/owner/OwnerLayout";
import StationForm from "./landingPage/owner/StationForm";
import StationList from "./landingPage/owner/StationList";
import OwnerBookings from "./landingPage/owner/OwnerBookings";
import OwnerStationEdit from "./landingPage/owner/OwnerStationEdit";
import StationSlots from "./landingPage/component/StationSlots";
import MyBookings from "./landingPage/pages/BookingList";
import UserProfile from "./landingPage/pages/UserProfile";
export default function App() {
  // // localStorage se role read karna
  // const user = JSON.parse(localStorage.getItem("user"));
  // const role = user?.role || "guest"; // agar login nahi hai to guest

  return (
    <BrowserRouter>
      <Navbar />
      <br />
      <br />
      <br />
      <br />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/profile" element={<UserProfile />} />

        {/* Owner routes sirf tabhi accessible jab role "owner" hai */}
        <Route path="/owner/dashboard" element={<OwnerLayout />} />
        <Route path="/owner/bookings" element={<OwnerBookings />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/owner/slots" element={<StationSlots />} />

        <Route path="/owner/stations" element={<StationList />} />
        <Route path="/owner/stations/new" element={<StationForm />} />
        <Route path="/owner/stations/:id/edit" element={<OwnerStationEdit />} />

        {/* agar user unauthorized route pe jaye */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
