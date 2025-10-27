// client/src/components/BookingModal.jsx
import React, { useState } from "react";
import API from "../../api";

export default function BookingModal({
  stationId,
  stationName,
  slot,
  onClose,
  onBooked,
  onConflict,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      const res = await API.post("/owner/bookings", {
        slotId: slot._id,
      });
      // success
      const booking = res.data.booking || res.data.booking || res.data;
      onBooked(booking, slot._id);
    } catch (err) {
      console.error("Booking error", err);
      if (err.response) {
        if (err.response.status === 409) {
          setError("Slot already booked by someone else. Refreshing slots...");
          // let parent refresh
          if (onConflict) onConflict();
        } else {
          setError(
            err.response.data?.message ||
              JSON.stringify(err.response.data) ||
              "Booking failed"
          );
        }
      } else {
        setError(err.message || "Network error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Confirm booking — {stationName}</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: 8 }}>
          <div>
            <b>Time</b>: {new Date(slot.start).toLocaleString()} —{" "}
            {new Date(slot.end).toLocaleString()}
          </div>
          <div>
            <b>Charger</b>: {slot.chargerType} (#{slot.chargerIndex + 1})
          </div>
          <div style={{ marginTop: 8 }} className="muted">
            Once you confirm, the slot will be reserved for you.
          </div>
        </div>

        {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Booking…" : "Confirm booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
