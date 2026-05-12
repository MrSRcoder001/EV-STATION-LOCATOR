import React, { useEffect, useState } from 'react';
import API from '../../api';
import toast from 'react-hot-toast';

export default function AdminAlerts() {
    const [faults, setFaults] = useState([]);
    const [emergencies, setEmergencies] = useState([]);
    const [loading, setLoading] = useState(true);

    const [notificationMessage, setNotificationMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        fetchFaults();
        fetchEmergencies();
        const socket = API.getSocket?.();
        const onEmergency = () => {
            toast.error("New emergency request received.");
            fetchEmergencies();
        };
        socket?.on?.('admin:emergency', onEmergency);
        return () => socket?.off?.('admin:emergency', onEmergency);
    }, []);

    const fetchFaults = async () => {
        try {
            setLoading(true);
            const res = await API.get('/faults');
            setFaults(res.data);
        } catch (err) {
            console.warn("Failed to fetch faults", err);
            toast.error("Failed to fetch fault reports.");
        } finally {
            setLoading(false);
        }
    };

    const fetchEmergencies = async () => {
        try {
            const res = await API.get('/admin/emergency');
            setEmergencies(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.warn("Failed to fetch emergency requests", err);
        }
    };

    const handleResolve = async (id) => {
        try {
            await API.put(`/faults/${id}/resolve`);
            toast.success("Fault marked as resolved.");
            fetchFaults();
        } catch (e) {
            toast.error("Failed to resolve fault.");
        }
    }

    const broadcastNotification = async (e) => {
        e.preventDefault();
        if (!notificationMessage.trim()) return toast.error("Write a message");
        setIsSending(true);
        try {
            await API.post('/notifications/broadcast', { message: notificationMessage, type: "system" });
            toast.success("Notification Broadcasted!");
            setNotificationMessage("");
        } catch (e) {
            toast.error("Failed to broadcast.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h2 className="text-3xl font-black uppercase tracking-tighter italic">Network Alerts</h2>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Fault Reporting & Global Broadcasting</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2"><span className="text-red-500">⚠</span> Active Fault Reports</h3>
                    {loading ? (
                        <div className="text-center py-10 text-white/40 animate-pulse text-xs font-bold uppercase">Loading...</div>
                    ) : faults.length === 0 ? (
                        <div className="text-center py-10 text-white/40 text-xs italic font-bold">No active faults reported. Network is healthy! 🟢</div>
                    ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {faults.map(f => (
                                <div key={f._id} className={`p-4 rounded-xl border ${f.status === 'Resolved' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-sm text-white/90">Station: {f.stationId?.name || f.stationId}</div>
                                        <div className={`text-[9px] font-black uppercase px-2 py-1 rounded ${f.status === 'Resolved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-500'}`}>{f.status}</div>
                                    </div>
                                    <p className="text-xs text-white/60 mb-4">{f.description}</p>
                                    <div className="flex justify-between items-end">
                                        <div className="text-[10px] text-white/30">Reported by {f.userId?.name || f.userId} on {new Date(f.createdAt).toLocaleDateString()}</div>
                                        {f.status !== 'Resolved' && (
                                            <button
                                                className="bg-primary/20 hover:bg-primary/40 text-primary-light text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-primary/30"
                                                onClick={() => handleResolve(f._id)}
                                            >
                                                Mark Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="glass-panel p-6">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2"><span className="text-blue-500">📢</span> Broadcast Notification</h3>
                    <p className="text-xs text-white/50 mb-6">Send an immediate system notification to all active users via WebSockets.</p>

                    <form onSubmit={broadcastNotification} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Message</label>
                            <textarea
                                value={notificationMessage}
                                onChange={e => setNotificationMessage(e.target.value)}
                                className="glass-input w-full min-h-[120px] resize-none"
                                placeholder="E.g. Due to scheduled maintenance, chargers in downtown will be offline from 2AM to 4AM."
                            />
                        </div>
                        <button type="submit" disabled={isSending} className="glass-btn-primary w-full py-3 disabled:opacity-50">
                            {isSending ? "Broadcasting..." : "Send to All Users"}
                        </button>
                    </form>
                </div>
            </div>

            <div className="glass-panel p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-black">Emergency Charging Monitor</h3>
                    <button onClick={fetchEmergencies} className="glass-btn px-4 py-2 text-xs">Refresh</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest text-[10px]">
                                <th className="pb-3 pl-4">User</th>
                                <th className="pb-3">Station</th>
                                <th className="pb-3 text-center">Battery</th>
                                <th className="pb-3 text-center">Priority</th>
                                <th className="pb-3 text-center">Status</th>
                                <th className="pb-3 text-right pr-4">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {emergencies.map((item) => (
                                <tr key={item._id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="py-3 pl-4">
                                        <div className="font-bold">{item.userId?.name || 'EV User'}</div>
                                        <div className="text-[10px] text-white/40">{item.userId?.phone || item.userId?.email || '-'}</div>
                                    </td>
                                    <td className="py-3 text-white/60">{item.stationId?.name || 'Unassigned'}</td>
                                    <td className="py-3 text-center font-bold">{item.batteryPercent}%</td>
                                    <td className="py-3 text-center uppercase text-xs">{item.priority}</td>
                                    <td className="py-3 text-center uppercase text-xs">{item.status}</td>
                                    <td className="py-3 text-right pr-4 text-white/40">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                                </tr>
                            ))}
                            {emergencies.length === 0 && (
                                <tr><td colSpan="6" className="py-8 text-center text-white/40">No emergency requests.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

