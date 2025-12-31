import React from "react";
import { Link, Outlet } from "react-router-dom";
import "./owner.css";
import OwnerBookings from "./OwnerBookings";
import StationList from "./StationList"
export default function OwnerLayout() {
  return (
    <div className="app-container">
      <div className="owner-wrap">
        <aside className="owner-sidebar">
          <div className="brand">
            <div className="logo">EV</div>
            <h2>Owner Dashboard</h2>
          </div>

          <nav className="side-nav">
            <Link to="/owner/dashboard" className="active">
              Stations
            </Link>
            <Link to="/owner/stations/new">➕ Add Station</Link>
            <Link to="/owner/bookings">Bookings</Link>
            <Link to="/owner/analytics">Analytics</Link>
            <Link to="/owner/profile">Profile</Link>
          </nav>
        </aside>

        <main className="content">
          <Outlet />
        </main>
        <div className="two">
          <>
            <StationList />
          </>
        </div>
      </div>
    </div>
  );
}


