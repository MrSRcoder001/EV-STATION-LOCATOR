import React, { useEffect, useState } from "react";
import API from "../../api";
import { Link } from "react-router-dom";

export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await API.get("/owner/bookings"); // as implemented
      setBookings(res.data || []);
    } catch (err) {
      console.error("owner bookings err", err);
      alert("Failed to load owner bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, action) {
    if (
      !window.confirm(
        `${action === "accept" ? "Accept" : "Reject"} this booking?`
      )
    )
      return;
    try {
      const res = await API.put(
        `/owner/bookings/${encodeURIComponent(id)}/decision`,
        { action }
      );
      alert(res.data.message || "Updated");
      // update local state
      setBookings((prev) =>
        prev.map((b) =>
          b._id === id
            ? { ...b, status: action === "accept" ? "accepted" : "rejected" }
            : b
        )
      );
    } catch (err) {
      console.error("decision err", err);
      alert(err.response?.data?.message || "Action failed");
    }
  }

  return (
    <div className="container">
      <h2>Bookings for my Stations</h2>
      {loading ? (
        <p>Loading...</p>
      ) : bookings.length === 0 ? (
        <p>No bookings</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {bookings.map((b) => (
            <div
              key={b._id}
              style={{ padding: 12, border: "1px solid #eee", borderRadius: 8 }}
            >
              <div style={{ fontWeight: 700 }}>{b.stationId?.name}</div>
              <div>
                User: {b.userId?.name} — {b.userId?.email}
              </div>
              <div>
                Slot: {new Date(b.slotId?.start).toLocaleString()} —{" "}
                {b.chargerType}
              </div>
              <div>
                Status: <strong>{b.status}</strong>
              </div>
              <div style={{ marginTop: 8 }}>
                {b.status === "pending" && (
                  <>
                    <button
                      className="btn"
                      onClick={() => decide(b._id, "accept")}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => decide(b._id, "reject")}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
