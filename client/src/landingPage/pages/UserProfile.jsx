// client/src/landingPage/pages/UserProfile.jsx
import React, { useEffect, useState } from "react";
import API from "../../api";
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";

export default function UserProfile() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    alternatePhone: "",
    profileImage: ""
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [navigate]);

  async function fetchData() {
    try {
      setLoading(true);
      const [bookingsRes, userRes] = await Promise.all([
        API.get("/bookings/me"),
        API.get("/auth/me").then(res => res.data.user).catch(() => JSON.parse(localStorage.getItem("user") || "{}"))
      ]);
      setBookings(bookingsRes.data);
      if (userRes && userRes.email) {
        setUser(userRes);
      } else {
        const u = localStorage.getItem("user");
        if (u) setUser(JSON.parse(u));
      }
    } catch (err) {
      console.error("fetch error", err);
      toast.error("Unable to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    try {
      setSaving(true);
      if (user.phone && (user.phone.length < 10 || user.phone.length > 15)) {
        toast.error("Phone number must be between 10 and 15 digits");
        setSaving(false);
        return;
      }
      const res = await API.put("/auth/update-profile", {
        name: user.name,
        phone: user.phone,
        alternatePhone: user.alternatePhone,
        profileImage: user.profileImage
      });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      toast.success("Profile updated");
      setEditing(false);
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  }

  function onChange(e) {
    setUser({ ...user, [e.target.name]: e.target.value });
  }

  async function cancelBooking(id) {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await API.delete(`/bookings/${id}`);
      setBookings(prev => prev.filter(b => b._id !== id));
      toast.success("Booking cancelled successfully");
    } catch (err) {
      console.error("Cancel failed", err);
      toast.error("Failed to cancel booking");
    }
  }

  async function payBooking(id) {
    const value = window.prompt("Enter amount to pay", "150");
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount");
    try {
      const res = await API.post(`/bookings/${id}/pay`, { amount });
      setBookings(prev => prev.map(b => String(b._id) === String(id) ? res.data.booking : b));
      toast.success("Payment successful");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    }
  }

  async function checkInBooking(booking) {
    const qrCode = window.prompt("Enter or scan booking QR code", booking.qrCode || "");
    if (!qrCode) return;
    try {
      const res = await API.post("/sessions/check-in", { bookingId: booking._id, qrCode });
      setBookings(prev => prev.map(b => String(b._id) === String(booking._id) ? res.data.booking : b));
      toast.success("Charging session started");
    } catch (err) {
      toast.error(err.response?.data?.message || "Check-in failed");
    }
  }

  async function completeSession(booking) {
    const meterEndKwh = Number(window.prompt("Final meter kWh", String(booking.meterCurrentKwh || booking.meterStartKwh || 0)));
    if (!Number.isFinite(meterEndKwh)) return toast.error("Enter a valid meter reading");
    try {
      const res = await API.put(`/sessions/${booking._id}/complete`, { meterEndKwh });
      setBookings(prev => prev.map(b => String(b._id) === String(booking._id) ? res.data.booking : b));
      toast.success("Session completed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to complete session");
    }
  }

  function getStatusStyle(status) {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "pending": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "accepted": return "bg-green-500/20 text-green-500 border-green-500/30";
      case "active": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "rejected": return "bg-red-500/20 text-red-500 border-red-500/30";
      case "completed": return "bg-primary/20 text-primary-light border-primary/30";
      case "cancelled": return "bg-white/10 text-white/40 border-white/10";
      default: return "bg-white/5 text-white/60 border-white/5";
    }
  }

  // Socket listener for status updates
  useEffect(() => {
    const socket = API.getSocket();
    if (!socket || !user.id) return;

    const handleUpdate = (data) => {
      // data: { bookingId, status }
      setBookings(prev => prev.map(b =>
        String(b._id) === String(data.bookingId) ? { ...b, status: data.status } : b
      ));
      if (data.status === 'accepted') toast.success("Booking approved by the station!");
      if (data.status === 'rejected') toast.error("Booking rejected by the station.");
    };

    socket.on('booking:updated', handleUpdate);
    return () => socket.off('booking:updated', handleUpdate);
  }, [user.id]);

  return (
    <div className="py-8 px-6 container mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Profile Info Section */}
        <aside className="lg:col-span-1">
          <div className="glass-panel p-8 sticky top-32">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black tracking-tighter text-white drop-shadow-md">Profile Settings</h2>
              {!editing && (
                <button className="text-[10px] font-bold text-primary-light hover:underline" onClick={() => setEditing(true)}>
                  Edit →
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <input name="name" value={user.name} onChange={onChange} placeholder="Full Name" required className="glass-input w-full text-sm" />
                <input value={user.email} disabled className="glass-input w-full text-sm opacity-50" />
                <input name="phone" value={user.phone} onChange={onChange} placeholder="Phone Number" className="glass-input w-full text-sm" />
                <input name="alternatePhone" value={user.alternatePhone} onChange={onChange} placeholder="Alternate Mobile" className="glass-input w-full text-sm" />
                <input name="profileImage" value={user.profileImage} onChange={onChange} placeholder="Profile Image URL" className="glass-input w-full text-sm" />
                <div className="flex gap-2 pt-4">
                  <button className="glass-btn-primary flex-1 py-3 text-xs" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                  <button type="button" className="glass-btn flex-1 py-3 text-xs" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl border-2 border-primary/30 bg-primary/10 flex items-center justify-center overflow-hidden shadow-xl shadow-primary/10">
                  {user.profileImage ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl text-white/20">👤</span>}
                </div>
                <h3 className="text-2xl font-black mb-1">{user.name}</h3>
                <p className="text-white/40 text-sm mb-6 pb-6 border-b border-white/5">{user.email}</p>
                <div className="space-y-3 text-left">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-white/30 tracking-widest">
                    <span>Phone</span>
                    <span className="text-white/60">{user.phone || "Not set"}</span>
                  </div>
                  {user.alternatePhone && (
                    <div className="flex justify-between text-[10px] uppercase font-bold text-white/30 tracking-widest">
                      <span>Alternate</span>
                      <span className="text-white/60">{user.alternatePhone}</span>
                    </div>
                  )}
                </div>

                {/* Eco Impact Dashboard */}
                <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black tracking-widest uppercase text-primary-light text-left mb-2">Eco Impact & Wallet</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40 font-bold">Wallet Balance</span>
                    <span className="font-mono text-green-400 font-bold">₹ {user.walletBalance || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40 font-bold">CO₂ Saved</span>
                    <span className="font-mono text-white font-bold">{(user.ecoStats?.co2Saved || 0).toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40 font-bold">Fuel Cost Saved</span>
                    <span className="font-mono text-white font-bold">₹ {(user.ecoStats?.fuelCostSaved || 0).toFixed(0)}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(((user.ecoStats?.co2Saved || 0) / 100) * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-[8px] text-white/30 text-left uppercase tracking-wider italic">Road to 100kg CO₂ saved</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Bookings Section */}
        <main className="lg:col-span-2 space-y-8">
          <div className="glass-panel p-8">
            <h3 className="text-2xl font-black tracking-tighter text-white mb-10 flex items-center gap-4">
              <span className="w-2 h-8 bg-gradient-to-b from-primary to-primary-dark rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
              Booking History
            </h3>

            {loading ? (
              <div className="py-20 text-center animate-pulse text-primary-light font-bold uppercase tracking-widest italic">Loading History...</div>
            ) : bookings.length === 0 ? (
              <div className="py-20 text-center glass-panel border-dashed border-white/10">
                <p className="text-white/20 italic">No activity detected in your account.</p>
                <button className="glass-btn-primary mt-6 px-8 py-3 text-xs" onClick={() => navigate('/home')}>Find Stations</button>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest text-[11px]">
                      <th className="pb-4 font-bold pl-4">Station / Location</th>
                      <th className="pb-4 font-bold text-center">Date & Time</th>
                      <th className="pb-4 font-bold text-right text-primary">Amount</th>
                      <th className="pb-4 font-bold text-center">Status</th>
                      <th className="pb-4 font-bold text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/80">
                    {bookings.map((b) => (
                      <tr key={b._id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="py-4 pl-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-sm font-black transform group-hover:scale-110 transition-transform duration-300">
                              🔌
                            </div>
                            <div>
                              <div className="font-bold text-white max-w-[150px] truncate group-hover:text-primary-light transition-colors">{b.stationId?.name || "Station"}</div>
                              <div className="text-[10px] text-white/30 font-medium truncate max-w-[180px]">{[b.stationId?.address?.fullAddress, b.stationId?.address?.area, b.stationId?.address?.city].filter(Boolean).join(', ') || "-"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <div className="font-mono text-white/80 font-bold">{new Date(b.slotId?.start || b.start).toLocaleDateString()}</div>
                          <div className="text-[10px] text-white/40 font-mono mt-0.5">{new Date(b.slotId?.start || b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="py-4 text-right">
                          <span className="font-mono font-black text-lg text-white group-hover:text-primary-light transition-colors drop-shadow-md">₹{b.amount || "—"}</span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`px-3 py-1 rounded-lg border text-[10px] font-black tracking-widest uppercase inline-block shadow-sm ${getStatusStyle(b.status)}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-4">
                          {String(b.status).toLowerCase() === 'pending' ? (
                            <button
                              className="text-[10px] font-bold text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/30 px-3 py-1.5 rounded-lg transition-all uppercase tracking-tighter shadow-md active:scale-95"
                              onClick={() => cancelBooking(b._id)}
                            >
                              Cancel
                            </button>
                          ) : String(b.paymentStatus).toLowerCase() !== 'paid' && ['accepted', 'active'].includes(String(b.status).toLowerCase()) ? (
                            <button
                              className="text-[10px] font-bold text-primary-light hover:text-slate-950 bg-primary/10 hover:bg-primary border border-primary/30 px-3 py-1.5 rounded-lg transition-all uppercase tracking-tighter shadow-md active:scale-95"
                              onClick={() => payBooking(b._id)}
                            >
                              Pay
                            </button>
                          ) : String(b.status).toLowerCase() === 'accepted' ? (
                            <button
                              className="text-[10px] font-bold text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-all uppercase tracking-tighter shadow-md active:scale-95"
                              onClick={() => checkInBooking(b)}
                            >
                              Check In
                            </button>
                          ) : String(b.status).toLowerCase() === 'active' ? (
                            <button
                              className="text-[10px] font-bold text-green-300 hover:text-white bg-green-500/10 hover:bg-green-500 border border-green-500/30 px-3 py-1.5 rounded-lg transition-all uppercase tracking-tighter shadow-md active:scale-95"
                              onClick={() => completeSession(b)}
                            >
                              Complete
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{b.qrCode || "—"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
