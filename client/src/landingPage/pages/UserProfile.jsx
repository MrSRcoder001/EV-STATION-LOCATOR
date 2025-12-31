// client/src/pages/UserProfile.jsx
import React, { useEffect, useState } from "react";
import API from "../../api"; // your axios wrapper (baseURL set)
import "./Profile.css";
import { useNavigate } from "react-router-dom";

export default function UserProfile() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }
    fetchBookings();
    // eslint-disable-next-line
  }, []);

  async function fetchBookings() {
    try {
      setLoading(true);
      const res = await API.get("/bookings/me"); // API has baseURL '/api'
      setBookings(res.data);
    } catch (err) {
      console.error("fetch bookings error", err);
      alert("Unable to load bookings");
    } finally {
      setLoading(false);
    }
  }

  function statusClass(status) {
    switch (status) {
      case "PENDING":
        return "badge pending";
      case "ACCEPTED":
        return "badge accepted";
      case "REJECTED":
        return "badge rejected";
      case "COMPLETED":
        return "badge completed";
      case "CANCELLED":
        return "badge cancelled";
      default:
        return "badge";
    }
  }

  return (
    <div className="profile-page container">
      <div className="profile-header">
        <h2>Your Profile</h2>
        <p>
          See your bookings and their current status (owner accepted/rejected).
        </p>
      </div>

      <section className="bookings-section">
        <h3>Your Bookings</h3>
        {loading ? (
          <p>Loading...</p>
        ) : bookings.length === 0 ? (
          <p>No bookings yet.</p>
        ) : (
          <div className="booking-list">
            {bookings.map((b) => (
              <div className="booking-card" key={b._id}>
                <div className="booking-left">
                  <div className="station-name">
                    {b.stationId?.name || "Station"}
                  </div>
                  <div className="station-address">{b.stationId?.address}</div>
                  <div className="slot-time">
                    {new Date(b.start).toLocaleString()} -{" "}
                    {new Date(b.end).toLocaleTimeString()}
                  </div>
                </div>
                <div className="booking-right">
                  <div className={statusClass(b.status)}>{b.status}</div>
                  <div className="booking-meta">
                    <div>Charger: {b.chargerIndex ?? "-"}</div>
                    <div>Price: ₹{b.price ?? "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
