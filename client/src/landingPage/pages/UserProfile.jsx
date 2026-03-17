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

  function getStatusStyle(status) {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "pending": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "accepted": return "bg-green-500/20 text-green-500 border-green-500/30";
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
    <div className="min-h-screen pt-32 pb-20 px-6 container mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Profile Info Section */}
        <aside className="lg:col-span-1">
          <div className="glass-panel p-8 sticky top-32">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black tracking-tighter uppercase">Profile</h2>
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
              </div>
            )}
          </div>
        </aside>

        {/* Bookings Section */}
        <main className="lg:col-span-2 space-y-8">
          <div className="glass-panel p-8">
            <h3 className="text-xl font-black tracking-tighter uppercase mb-8 flex items-center gap-3">
              <span className="w-2 h-6 bg-primary rounded-full"></span>
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
              <div className="space-y-4">
                {bookings.map((b) => (
                  <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group" key={b._id}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-primary text-glow-primary">🔌</span>
                        <h4 className="font-black text-lg group-hover:text-primary-light transition-colors">{b.stationId?.name || "Station"}</h4>
                      </div>
                      <p className="text-xs text-white/40 mb-4 line-clamp-1 italic">{[b.stationId?.address?.fullAddress, b.stationId?.address?.area, b.stationId?.address?.village, b.stationId?.address?.city, b.stationId?.address?.pincode].filter(Boolean).join(', ')}</p>
                      <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> {new Date(b.slotId?.start || b.start).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/20"></span> {new Date(b.slotId?.start || b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                      <span className={`px-4 py-1.5 rounded-lg border text-[10px] font-black tracking-widest uppercase ${getStatusStyle(b.status)}`}>
                        {b.status}
                      </span>
                      <div className="text-right">
                        <div className="text-lg font-black text-white italic">₹{b.price || "—"}</div>
                        <div className="text-[9px] text-white/30 font-bold uppercase">Total Amount</div>
                      </div>
                      {String(b.status).toLowerCase() === 'pending' && (
                        <button className="text-[10px] font-bold text-red-500/60 hover:text-red-500 underline uppercase tracking-tighter mt-2" onClick={() => cancelBooking(b._id)}>
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
