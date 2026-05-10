import React, { useState, useEffect } from 'react';
import API from '../../api';
import toast from 'react-hot-toast';

export default function AdminSessions() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const res = await API.get('/admin/bookings');
                setBookings(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error("Failed to fetch sessions:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();

        const socket = API.getSocket();
        if (!socket) return;

        const handleNewBooking = (data) => {
            toast.success(`Incoming booking request for ${data.stationName}!`, { icon: '🔌' });
            fetchBookings();
        };

        socket.on('booking:new', handleNewBooking);
        return () => socket.off('booking:new', handleNewBooking);
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

    async function forceStop(id) {
        if (!window.confirm("CRITICAL: Terminate this session forcefully?")) return;
        try {
            await API.put(`/admin/bookings/${id}/force-stop`);
            toast.success("Session forcefully terminated.");
            const res = await API.get('/admin/bookings');
            setBookings(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error("Failed to terminate session.");
        }
    }

    const glassWidget = "glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden";
    const headerTitle = "text-lg font-bold text-white mb-6 tracking-wide";
    const safeString = (val) => String(val || "-");

    const getInitial = (name) => {
        const str = String(name || "U");
        return str.charAt(0).toUpperCase() || "U";
    };

    return (
        <div className="space-y-6">
            <div className={`${glassWidget} min-h-[calc(100vh-140px)] flex flex-col`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className={headerTitle}>Charging Sessions</h2>
                    <div className="flex gap-2">
                        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 text-xs font-bold rounded-lg border border-yellow-500/30">Logged Activities: {bookings.length}</span>
                    </div>
                </div>
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest text-[11px]">
                                <th className="pb-4 font-bold pl-4">Transacting Profile</th>
                                <th className="pb-4 font-bold">Charge Endpoint</th>
                                <th className="pb-4 font-bold text-center">Timestamp</th>
                                <th className="pb-4 font-bold text-center">Energy Delivery</th>
                                <th className="pb-4 font-bold text-right text-primary">Revenue</th>
                                <th className="pb-4 font-bold text-center pr-4">Transaction State</th>
                            </tr>
                        </thead>
                        <tbody className="text-white/80">
                            {bookings.length === 0 && !loading && (
                                <tr><td colSpan="6" className="text-center py-12 text-white/40">No charging sessions logged.</td></tr>
                            )}
                            {loading && (
                                <tr><td colSpan="6" className="text-center py-12 text-white/40">Loading sessions...</td></tr>
                            )}
                            {bookings.map((b, i) => (
                                <tr key={b._id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-4 pl-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-black uppercase">
                                                {getInitial(b.userId?.name)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white max-w-[120px] truncate">{safeString(b.userId?.name || "Anonymous")}</div>
                                                <div className="text-[9px] text-white/30 font-mono">UID: {b.userId?._id?.slice(-6) || "..."}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="text-white/80 font-medium max-w-[150px] truncate">{safeString(b.stationId?.name || b.meta?.stationName)}</div>
                                    </td>
                                    <td className="py-4 text-center">
                                        <div className="font-mono text-white/80">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-'}</div>
                                        <div className="text-[10px] text-white/40 font-mono mt-0.5">{b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className="text-secondary font-black text-lg">{b.meta?.energy || "15"} <span className="text-[10px] font-bold text-white/50 uppercase">kWh</span></span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className="font-mono font-bold text-lg text-primary-light">₹{b.meta?.amount || "350"}</span>
                                    </td>
                                    <td className="py-4 text-center pr-4">
                                        {String(b.status).toLowerCase() === 'pending' || String(b.status).toLowerCase() === 'queued' || String(b.status).toLowerCase() === 'active' ? (
                                            <div className="flex flex-col gap-2 items-center">
                                                <span className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
                                                    {safeString(b.status)}
                                                </span>
                                                <div className="flex gap-2">
                                                    {String(b.status).toLowerCase() === 'pending' && (
                                                        <>
                                                            <button onClick={() => decide(b._id, 'accept')} className="text-[10px] px-2 py-1 bg-primary/20 text-primary-light hover:bg-primary/40 rounded transition-colors">✔ Accept</button>
                                                            <button onClick={() => decide(b._id, 'reject')} className="text-[10px] px-2 py-1 bg-red-400/20 text-red-400 hover:bg-red-400/40 rounded transition-colors">✖ Reject</button>
                                                        </>
                                                    )}
                                                    {(String(b.status).toLowerCase() === 'active' || String(b.status).toLowerCase() === 'queued' || String(b.status).toLowerCase() === 'accepted') && (
                                                        <button onClick={() => forceStop(b._id)} className="text-[8px] px-2 py-1 bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600/50 uppercase tracking-widest rounded transition-colors">Force Stop</button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${b.status === 'rejected' || b.status === 'cancelled' ? 'bg-red-400/20 text-red-400 border border-red-400/30' : 'bg-primary/20 text-primary-light border border-primary/30'}`}>
                                                {safeString(b.status)}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
