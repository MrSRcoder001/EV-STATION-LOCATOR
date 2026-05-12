import React, { useEffect, useState, useMemo } from 'react';
import API from '../../api';
import toast from 'react-hot-toast';
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";

const mapContainerStyle = {
    width: '100%',
    height: '350px',
    borderRadius: '1rem'
};

export default function AdminDashboard() {
    const [stats, setStats] = useState({ totalUsers: 0, totalStations: 0, totalBookings: 0, pendingBookings: 0 });
    const [analytics, setAnalytics] = useState({ revenue: 0, totalKwh: 0, activeFaults: 0, bookingsByStatus: [] });
    const [liveStations, setLiveStations] = useState([]);
    const [liveBookings, setLiveBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const { isLoaded } = useJsApiLoader({
        id: "admin-google-map-script",
        googleMapsApiKey: "AIzaSyDZG_Bf3bqCrV6VnNykIVX3QeRjrTCpGbA"
    });

    const center = useMemo(() => ({ lat: 18.5204, lng: 73.8567 }), []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [resStats, resStations, resBookings, resAnalytics] = await Promise.all([
                    API.get('/admin/stats'),
                    API.get('/admin/stations'),
                    API.get('/admin/bookings'),
                    API.get('/admin/analytics')
                ]);
                setStats(resStats.data || { totalUsers: 0, totalStations: 0, totalBookings: 0, pendingBookings: 0 });
                setLiveStations(Array.isArray(resStations.data) ? resStations.data : []);
                setLiveBookings(Array.isArray(resBookings.data) ? resBookings.data : []);
                setAnalytics(resAnalytics.data || { revenue: 0, totalKwh: 0, activeFaults: 0, bookingsByStatus: [] });
            } catch (err) {
                console.warn("Failed to load admin integrations.", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Helper classes for widget containers
    const glassWidget = "glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden";
    const headerTitle = "text-sm font-bold text-white mb-4 tracking-wide";

    const safeString = (val) => String(val || "-");
    const stationAddress = (station) => {
        const address = station?.address;
        if (!address) return "-";
        if (typeof address === "string") return address;
        return [address.fullAddress, address.area, address.city, address.pincode].filter(Boolean).join(", ") || "-";
    };
    const chargerCapacity = (station) => (station?.chargers || station?.connectors || [])
        .reduce((sum, charger) => sum + Number(charger.count || charger.chargerCount || 1), 0);
    const availableChargers = (station) => (station?.chargers || station?.connectors || [])
        .filter((charger) => charger.isActive !== false)
        .reduce((sum, charger) => sum + Number(charger.count || charger.chargerCount || 1), 0);
    const getInitial = (name) => {
        const str = String(name || "U");
        return str.charAt(0).toUpperCase() || "U";
    };

    return (
        <div className="space-y-6">
            {/* ROW 1: 4 Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`${glassWidget} bg-gradient-to-br from-green-500/10 to-transparent flex gap-4 items-center`}>
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl">🔌</div>
                    <div>
                        <div className="text-[11px] text-white/50 font-bold uppercase tracking-widest">Total Stations</div>
                        <div className="text-2xl font-black text-white my-0.5">{stats.totalStations}</div>
                        <div className="text-[10px] text-primary font-bold">Live Data</div>
                    </div>
                </div>

                <div className={`${glassWidget} bg-gradient-to-br from-blue-500/10 to-transparent flex gap-4 items-center`}>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl">⚡</div>
                    <div>
                        <div className="text-[11px] text-white/50 font-bold uppercase tracking-widest">Active Users</div>
                        <div className="text-2xl font-black text-white my-0.5">{stats.totalUsers}</div>
                        <div className="text-[10px] flex items-center gap-2 font-bold">
                            <span className="text-green-400">Registered on Network</span>
                        </div>
                    </div>
                </div>

                <div className={`${glassWidget} bg-gradient-to-br from-yellow-500/10 to-transparent flex gap-4 items-center`}>
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-xl">📅</div>
                    <div>
                        <div className="text-[11px] text-white/50 font-bold uppercase tracking-widest">Global Sessions</div>
                        <div className="text-2xl font-black text-white my-0.5">{stats.totalBookings}</div>
                        <div className="text-[10px] text-yellow-400 font-bold">{stats.pendingBookings} Pending</div>
                    </div>
                </div>

                <div className={`${glassWidget} bg-gradient-to-br from-purple-500/10 to-transparent flex gap-4 items-center`}>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl">💰</div>
                    <div>
                        <div className="text-[11px] text-white/50 font-bold uppercase tracking-widest">Network Revenue</div>
                        <div className="text-2xl font-black text-white my-0.5">{analytics.revenue?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) || "₹0"}</div>
                        <div className="text-[10px] text-purple-400 font-bold">Total KWh: {analytics.totalKwh?.toFixed(0) || 0}</div>
                    </div>
                </div>
            </div>

            {/* ROW 2: Overview Table, Charger Status, System Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Station Status Overview */}
                <div className={`${glassWidget} lg:col-span-2 flex flex-col`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={headerTitle}>Station Status Overview</h3>
                        <button className="text-[10px] bg-white/5 px-3 py-1 rounded-full font-bold text-primary-light hover:bg-white/10 transition-colors">View All</button>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest">
                                    <th className="pb-3 font-bold">Station Name</th>
                                    <th className="pb-3 font-bold">Location</th>
                                    <th className="pb-3 font-bold text-center">Chargers</th>
                                    <th className="pb-3 font-bold text-center">Available</th>
                                    <th className="pb-3 font-bold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-white/80">
                                {liveStations.length === 0 && !loading && (
                                    <tr><td colSpan="5" className="text-center py-6 text-white/40">No stations registered.</td></tr>
                                )}
                                {liveStations.slice(0, 10).map((s, i) => (
                                    <tr key={s._id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 font-bold flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${chargerCapacity(s) > 0 ? 'bg-primary' : 'bg-red-500'}`}></span>
                                            {safeString(s.name)}
                                        </td>
                                        <td className="py-3 text-white/50">{stationAddress(s)}</td>
                                        <td className="py-3 text-center">{chargerCapacity(s)}</td>
                                        <td className="py-3 text-center font-bold text-white">{availableChargers(s)}</td>
                                        <td className="py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${s.status === 'Active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : s.status === 'Maintenance' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
                                                {s.status || "Active"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Live Satellite Feed */}
                <div className={`${glassWidget} lg:col-span-2 flex flex-col p-1`}>
                    <div className="absolute top-4 left-4 z-10 glass-panel px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border-white/10 shadow-xl bg-slate-900/80">🔴 Live Grid Map</div>
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={center}
                            zoom={11}
                            options={{ disableDefaultUI: true, styles: [{ stylers: [{ invert_lightness: true }] }] }}
                        >
                            {liveStations.map(station => {
                                const lat = station.location?.coordinates?.[1];
                                const lng = station.location?.coordinates?.[0];
                                if (!lat || !lng) return null;
                                return (
                                    <MarkerF
                                        key={station._id}
                                        position={{ lat, lng }}
                                        icon={{
                                            path: "M-1.547 12l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM0 0q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z",
                                            fillColor: station.status === 'Active' ? "#22c55e" : station.status === 'Maintenance' ? "#eab308" : "#ef4444",
                                            fillOpacity: 1,
                                            strokeWeight: 0,
                                            scale: 1.5,
                                        }}
                                    />
                                );
                            })}
                        </GoogleMap>
                    ) : (
                        <div className="w-full h-[350px] flex justify-center items-center text-white/50 bg-white/5 rounded-xl">Initializing Map Engine...</div>
                    )}
                </div>

                {/* Charger Status Donut (Mocked with CSS) */}
                <div className={`${glassWidget} flex flex-col`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className={headerTitle}>Charger Status</h3>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 relative">
                        <div className="relative w-32 h-32">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 stroke-current">
                                <circle cx="18" cy="18" r="16" fill="none" className="text-white/5" strokeWidth="4"></circle>
                                <circle cx="18" cy="18" r="16" fill="none" className="text-green-500" strokeWidth="4" strokeDasharray="100 100" strokeDashoffset="0"></circle>
                                <circle cx="18" cy="18" r="16" fill="none" className="text-yellow-400" strokeWidth="4" strokeDasharray="25 100" strokeDashoffset="-75"></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-white leading-none">120</span>
                                <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Total</span>
                            </div>
                        </div>

                        <div className="w-full flex justify-between text-[10px] font-bold pb-2">
                            <div className="text-center">
                                <div className="text-green-500 flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> 95</div>
                                <div className="text-white/40 uppercase">Online</div>
                            </div>
                            <div className="text-center">
                                <div className="text-yellow-400 flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> 10</div>
                                <div className="text-white/40 uppercase">Faulty</div>
                            </div>
                            <div className="text-center">
                                <div className="text-white/60 flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-white/20 border border-white/30"></span> 15</div>
                                <div className="text-white/40 uppercase">Offline</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Alerts */}
                <div className={`${glassWidget} flex flex-col`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={headerTitle}>System Alerts</h3>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto">
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3">
                            <span className="text-red-400 text-sm mt-0.5">⚠️</span>
                            <div>
                                <div className="text-xs font-bold text-red-400">{analytics.activeFaults} Active Fault Reports pending</div>
                                <div className="text-[10px] text-white/50">Needs attention</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* ROW 3: Recent Sessions and Usage Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Recent Sessions Table */}
                <div className={`${glassWidget} lg:col-span-3 flex flex-col`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={headerTitle}>Recent Sessions</h3>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest">
                                    <th className="pb-3 font-bold min-w-[120px]">User</th>
                                    <th className="pb-3 font-bold min-w-[140px]">Station</th>
                                    <th className="pb-3 font-bold text-center">Time</th>
                                    <th className="pb-3 font-bold text-center">Energy</th>
                                    <th className="pb-3 font-bold text-right">Amount</th>
                                    <th className="pb-3 font-bold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-white/80">
                                {liveBookings.length === 0 && !loading && (
                                    <tr><td colSpan="6" className="text-center py-6 text-white/40">No recent sessions found.</td></tr>
                                )}
                                {liveBookings.slice(0, 10).map((b, i) => (
                                    <tr key={b._id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-2.5 font-bold flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary shrink-0 font-black uppercase">
                                                {getInitial(b.userId?.name)}
                                            </div>
                                            <span className="truncate max-w-[100px] block">{safeString(b.userId?.name || "Anonymous")}</span>
                                        </td>
                                        <td className="py-2.5 text-white/70 font-medium truncate max-w-[120px]">{safeString(b.stationId?.name || b.meta?.stationName)}</td>
                                        <td className="py-2.5 text-center font-mono text-white/50">{b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                        <td className="py-2.5 text-center text-secondary font-bold">{b.meta?.energy || "15"} kWh</td>
                                        <td className="py-2.5 text-right font-mono font-bold">₹{b.meta?.amount || "350"}</td>
                                        <td className="py-2.5 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${b.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-primary/20 text-primary-light'}`}>
                                                {safeString(b.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Usage Analytics */}
                <div className={`${glassWidget} flex flex-col`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className={headerTitle}>Usage Analytics</h3>
                        <select className="bg-white/5 border border-white/10 text-[10px] font-bold text-white/70 px-2 py-1 rounded-lg outline-none">
                            <option>Today</option>
                        </select>
                    </div>
                    <div className="mb-2">
                        <div className="text-3xl font-black text-white">{stats.totalBookings}</div>
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Total Sessions</span>
                            <span className="text-[10px] text-primary font-bold">↗ +14%</span>
                        </div>
                    </div>
                    <div className="flex-1 w-full bg-white/5 rounded-xl border border-white/5 mt-4 overflow-hidden relative group p-2">
                        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-1 h-3/4 opacity-70 group-hover:opacity-100 transition-opacity">
                            {/* Bar mock */}
                            {[10, 15, 8, 30, 45, 60, 80, 95, 70, 50, 40, 25].map((val, i) => (
                                <div key={i} className="flex-1 bg-gradient-to-t from-primary/50 to-primary/80 rounded-t-sm" style={{ height: `${val}%` }}></div>
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-4 border-t border-white/10 flex justify-between px-1 text-[7px] font-bold text-white/30 uppercase pt-0.5">
                            <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span>
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-xs">
                            <span className="font-bold text-white/60">Peak Hours</span>
                            <span className="font-bold text-blue-400">6 PM - 9 PM</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-xs">
                            <span className="font-bold text-white/60">Most Used</span>
                        <span className="font-bold text-primary-light">{liveStations[0]?.name || 'No station yet'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 4: Micro widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pb-8">
                <div className={`${glassWidget} p-4`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-[11px] text-white/50 font-bold uppercase tracking-widest">User Overview</div>
                        <span className="text-secondary opacity-50">👥</span>
                    </div>
                    <div className="text-2xl font-black mb-1">1,245</div>
                    <div className="text-[9px] text-primary font-bold mb-4">↗ +18% this month</div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
                        <div className="h-full bg-primary" style={{ width: '75%' }}></div>
                    </div>
                    <div className="flex justify-between text-[8px] mt-1 font-bold uppercase tracking-widest">
                        <span className="text-primary">890 Active</span>
                        <span className="text-white/40">355 Inactive</span>
                    </div>
                </div>

                <div className={`${glassWidget} p-4 lg:col-span-2 flex justify-between`}>
                    <div>
                        <div className="text-[11px] text-white/50 font-bold uppercase tracking-widest mb-2">Revenue This Month</div>
                        <div className="text-2xl font-black mb-1">₹4,85,120</div>
                        <div className="text-[9px] text-white/40 tracking-widest uppercase mb-1">Total Revenue</div>
                        <div className="text-[10px] text-primary font-bold">↗ +15% vs last month</div>
                    </div>
                    <div className="flex items-end gap-1 h-16 w-32 border-b border-white/10 pb-1">
                        {[40, 20, 60, 80, 50, 90, 70].map((v, i) => (
                            <div key={i} className="flex-1 bg-blue-500 rounded-t-sm hover:bg-blue-400 transition-colors" style={{ height: `${v}%` }}></div>
                        ))}
                    </div>
                </div>

                <div className={`${glassWidget} p-4`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-[11px] text-white/50 font-bold uppercase tracking-widest">Top Stations (Usage)</div>
                    </div>
                    <div className="space-y-3">
                        {[{ num: 1, name: "EV Hub Pune", v: "320" }, { num: 2, name: "ChargePoint Mumbai", v: "210" }, { num: 3, name: "Tata Power Nashik", v: "150" }].map(s => (
                            <div key={s.num} className="flex items-center gap-2 justify-between">
                                <span className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-black ${s.num === 1 ? 'bg-green-500/20 text-primary uppercase' : 'bg-white/10 text-white/60'}`}>{s.num}</span>
                                <span className="text-[10px] font-bold text-white flex-1 truncate">{s.name}</span>
                                <span className="text-[10px] font-bold text-white/40">{s.v} sesh</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
