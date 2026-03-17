// client/src/landingPage/component/BookingModal.jsx
import React, { useState } from "react";
import API from "../../api";
import toast from 'react-hot-toast';

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
      const res = await API.post("/bookings", {
        slotId: slot._id,
      });
      const booking = res.data.booking || res.data;
      onBooked(booking, slot._id);
      toast.success("Booking confirmed.");
    } catch (err) {
      console.error("Booking error", err);
      if (err.response?.status === 409) {
        setError("Slot is already booked. Please try another one.");
        if (onConflict) onConflict();
      } else {
        setError(err.response?.data?.message || "Booking Interrupted");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="glass-panel w-full max-w-md relative animate-float shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black italic tracking-tighter">CONFIRM BOOKING</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">{stationName}</p>
          </div>
          <button className="w-8 h-8 flex items-center justify-center glass-panel hover:bg-red-500/20 text-white/50 hover:text-white" onClick={onClose}>✕</button>
        </div>

        <div className="p-8 space-y-6">
          <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
            <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-4">Booking Summary</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/20 uppercase font-bold">Start Time</span>
                <span className="text-xs font-mono text-primary-light">{new Date(slot.start).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/20 uppercase font-bold">End Time</span>
                <span className="text-xs font-mono text-white/60">{new Date(slot.end).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/20 uppercase font-bold">Station Info</span>
                <span className="text-xs font-mono text-white/60">{slot.chargerType} (#{slot.chargerIndex + 1})</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-white/30 italic text-center px-4">
            Once confirmed, this charging point will be reserved exclusively for your session.
          </p>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-[10px] text-red-400 font-bold uppercase tracking-widest">
              Error: {error}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button className="flex-1 glass-btn text-xs py-3" onClick={onClose} disabled={loading}>Cancel</button>
            <button
              className="flex-1 glass-btn-primary text-xs py-3 disabled:opacity-50"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Confirming..." : "Confirm Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
