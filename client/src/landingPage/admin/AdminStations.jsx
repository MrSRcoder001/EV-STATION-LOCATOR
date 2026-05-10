import React, { useState, useEffect } from 'react';
import API from '../../api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminStations() {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const res = await API.get('/admin/stations');
                setStations(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error("Failed to fetch stations:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStations();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this station?")) return;
        try {
            await API.delete(`/owner/stations/${id}`);
            toast.success("Station deleted successfully");
            setStations(stations.filter((s) => s._id !== id));
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    const glassWidget = "glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden";
    const headerTitle = "text-lg font-bold text-white mb-6 tracking-wide";
    const safeString = (val) => String(val || "-");

    return (
        <div className="space-y-6">
            <div className={`${glassWidget} min-h-[calc(100vh-140px)] flex flex-col`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className={headerTitle}>Network Stations</h2>
                    <div className="flex gap-4 items-center">
                        <span className="bg-primary/20 text-primary-light px-3 py-1 text-xs font-bold rounded-lg border border-primary/30">Total: {stations.length}</span>
                        <Link to="/admin/stations/new" className="glass-btn-primary px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest">
                            Add New Station
                        </Link>
                    </div>
                </div>
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest text-[11px]">
                                <th className="pb-4 font-bold pl-4">Station ID / Name</th>
                                <th className="pb-4 font-bold">Location</th>
                                <th className="pb-4 font-bold">Owner / Provider</th>
                                <th className="pb-4 font-bold text-center">Connectors</th>
                                <th className="pb-4 font-bold text-center">Added On</th>
                                <th className="pb-4 font-bold text-center">Status</th>
                                <th className="pb-4 font-bold text-right pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-white/80">
                            {stations.length === 0 && !loading && (
                                <tr><td colSpan="7" className="text-center py-12 text-white/40">No stations registered on the network.</td></tr>
                            )}
                            {loading && (
                                <tr><td colSpan="7" className="text-center py-12 text-white/40">Loading stations...</td></tr>
                            )}
                            {stations.map((s, i) => (
                                <tr key={s._id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-4 pl-4">
                                        <div className="font-bold text-white flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${s.connectors?.length > 0 ? 'bg-primary' : 'bg-red-500'}`}></span>
                                            {safeString(s.name)}
                                        </div>
                                        <div className="text-[10px] text-white/40 font-mono mt-1">{safeString(s._id)}</div>
                                    </td>
                                    <td className="py-4 text-white/60 text-xs max-w-[200px] truncate">{safeString(s.address)}</td>
                                    <td className="py-4">
                                        <div className="text-xs">{s.ownerId?.name || "System Provided"}</div>
                                        <div className="text-[10px] text-white/50">{s.ownerId?.email || "N/A"}</div>
                                    </td>
                                    <td className="py-4 text-center font-bold text-xl">{s.connectors?.length || 0}</td>
                                    <td className="py-4 text-center font-mono text-xs text-white/50">
                                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className="px-3 py-1 rounded-md text-[10px] font-bold border bg-green-500/20 text-green-400 border-green-500/30 uppercase tracking-widest">Active</span>
                                    </td>
                                    <td className="py-4 text-right pr-4">
                                        <div className="flex items-center justify-end gap-2 text-xs">
                                            <Link to={`/admin/stations/${s._id}/edit`} className="glass-btn px-3 py-1">Edit</Link>
                                            <button onClick={() => handleDelete(s._id)} className="glass-btn text-red-400 hover:text-red-500 hover:bg-red-500/10 px-3 py-1">Del</button>
                                        </div>
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
