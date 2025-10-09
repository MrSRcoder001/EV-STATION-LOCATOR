import React from "react";
import { Link, Outlet } from "react-router-dom";

export default function OwnerLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{ width: "250px", background: "var(--card)", padding: "20px" }}
      >
        <h2 style={{ color: "var(--accent)" }}>Owner Dashboard</h2>
        <nav>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <Link to="/owner/stations">Stations</Link>
            </li>
            <li>
              <Link to="/owner/stations/new">➕ Add Station</Link>
            </li>
            <li>
              <Link to="/owner/bookings">Bookings</Link>
            </li>
            <li>
              <Link to="/owner/analytics">Analytics</Link>
            </li>
            <li>
              <Link to="/owner/profile">Profile</Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: "20px" }}>
        <Outlet />
      </main>
    </div>
  );
}
