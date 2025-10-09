import React from "react";
import { Link, Outlet } from "react-router-dom";
import "./owner.css";

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
            <Link to="/owner/stations" className="active">
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
      </div>
    </div>
  );
}


