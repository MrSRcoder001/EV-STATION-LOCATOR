// client/src/landingPage/owner/OwnerBookings.jsx
import React, { useEffect, useState } from "react";
import API from "../../api";
import toast from 'react-hot-toast';

export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // "active" (pending) or "archive" (accepted/rejected/cancelled)

  async function load() {
    try {
      setLoading(true);
      const res = await API.get("/owner/bookings");
      setBookings(res.data || []);
    } catch (err) {
      toast.error("Failed to load incoming requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, action) {
    if (!window.confirm(`${action === "accept" ? "Accept" : "Reject"} this booking?`)) return;
    try {
      const res = await API.put(`/owner/bookings/${encodeURIComponent(id)}/decision`, { action });
      toast.success(res.data.message || "Booking Updated");
      setBookings((prev) =>
        prev.map((b) =>
          String(b._id) === String(id) ? { ...b, status: action === "accept" ? "accepted" : "rejected" } : b
        )
      );
    } catch (err) {
      toast.error("Action failed. Please try again.");
    }
  }

  function getStatusStyle(status) {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "accepted": return "text-primary-light bg-primary/10 border-primary/20 shadow-[0_0_15px_-5px_var(--color-primary)]";
      case "rejected": return "text-red-400 bg-red-400/10 border-red-400/20";
      case "pending": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "cancelled": return "text-white/40 bg-white/5 border-white/5";
      default: return "text-white/40 bg-white/5 border-white/5";
    }
  }

  // Socket listener for new incoming bookings
  useEffect(() => {
    const socket = API.getSocket();
    if (!socket) return;

    const handleNewBooking = (data) => {
      toast.success(`Incoming booking request for ${data.stationName}!`, { icon: '🔌' });
      load();
    };

    socket.on('booking:new', handleNewBooking);
    return () => socket.off('booking:new', handleNewBooking);
  }, []);

  const activeBookings = bookings.filter(b => String(b.status).toLowerCase() === "pending");
  const archiveBookings = bookings.filter(b => String(b.status).toLowerCase() !== "pending");
  const displayedBookings = activeTab === "active" ? activeBookings : archiveBookings;

  return (
    <div className="glass-panel p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic">Incoming Bookings</h2>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Real-time Booking Requests</p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-stretch md:self-auto">
          <button
            className={`px-6 py-2 text-[10px] font-black tracking-widest uppercase rounded-lg transition-all ${activeTab === 'active' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            onClick={() => setActiveTab('active')}
          >
            Active Requests ({activeBookings.length})
          </button>
          <button
            className={`px-6 py-2 text-[10px] font-black tracking-widest uppercase rounded-lg transition-all ${activeTab === 'archive' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
            onClick={() => setActiveTab('archive')}
          >
            Archive History
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-white/20 text-xs font-bold tracking-widest uppercase">Loading Bookings...</div>
      ) : displayedBookings.length === 0 ? (
        <div className="py-20 text-center glass-panel border-dashed border-white/10 italic text-white/20">
          {activeTab === 'active' ? 'No active booking requests found.' : 'Your history is currently empty.'}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedBookings.map((b) => (
            <div key={b._id} className="glass-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-white/20">
              <div className="flex-1 space-y-3 w-full">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-primary/40 rounded-full group-hover:bg-primary transition-colors"></div>
                    <h4 className="font-black text-lg">{b.stationId?.name}</h4>
                  </div>
                  <span className={`md:hidden px-4 py-1.5 rounded-lg border text-[10px] font-black tracking-widest uppercase ${getStatusStyle(b.status)}`}>
                    {b.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-5">
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Customer Information</div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{b.userId?.name}</span>
                      <span className="text-xs text-white/40 italic">{b.userId?.email || 'No Email'}</span>
                      <span className="text-xs text-primary-light font-mono font-bold mt-1 tracking-tighter">
                        {b.userId?.phone ? `📞 ${b.userId.phone}` : 'No Contact Phone'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Booking Time</div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">
                        {new Date(b.slotId?.start || b.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <span className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">
                        {b.chargerType || (b.meta && b.meta.chargerType) || 'Normal'} Charger
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                <span className={`hidden md:block px-4 py-1.5 rounded-lg border text-[10px] font-black tracking-widest uppercase ${getStatusStyle(b.status)}`}>
                  {b.status}
                </span>

                {String(b.status).toLowerCase() === "pending" && (
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => decide(b._id, "accept")} className="glass-btn-primary flex-1 md:flex-none px-6 py-2 text-[10px]">ACCEPT</button>
                    <button onClick={() => decide(b._id, "reject")} className="glass-btn flex-1 md:flex-none px-6 py-2 text-[10px] text-red-400/60 hover:text-red-400">REJECT</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
