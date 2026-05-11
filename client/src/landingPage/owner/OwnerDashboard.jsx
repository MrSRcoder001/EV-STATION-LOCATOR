import React, { useEffect, useMemo, useState } from 'react';
import API from '../../api';
import { Link } from 'react-router-dom';
import { formatCurrency, stationAddress, statusClass, bookingStart } from './ownerUtils';

export default function OwnerDashboard() {
  const [stations, setStations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [stationRes, bookingRes, analyticsRes] = await Promise.all([
          API.get('/owner/stations'),
          API.get('/owner/bookings'),
          API.get('/owner/bookings/analytics'),
        ]);
        setStations(Array.isArray(stationRes.data) ? stationRes.data : []);
        setBookings(Array.isArray(bookingRes.data) ? bookingRes.data : []);
        setAnalytics(analyticsRes.data || null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stationNeedingSetup = useMemo(() => stations.find((s) => !s.chargers?.length), [stations]);
  const pending = bookings.filter((b) => b.status === 'pending');
  const activeStations = stations.filter((s) => (s.status || 'Active') === 'Active').length;

  const statCards = [
    { label: 'Stations', value: analytics?.stations ?? stations.length, hint: `${activeStations} active` },
    { label: 'Chargers', value: analytics?.chargers ?? 0, hint: 'capacity online' },
    { label: 'Pending', value: analytics?.pendingBookings ?? pending.length, hint: 'booking decisions' },
    { label: 'Revenue', value: formatCurrency(analytics?.revenue), hint: `${Number(analytics?.totalKwh || 0).toFixed(1)} kWh sold` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <div key={card.label} className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{card.label}</div>
            <div className="text-3xl font-black mt-2">{card.value}</div>
            <div className="text-[10px] text-primary-light font-bold mt-1 uppercase">{card.hint}</div>
          </div>
        ))}
      </div>

      {stations.length === 0 && !loading && (
        <div className="glass-panel p-6 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Register your first station</h2>
            <p className="text-sm text-white/50 mt-1">Add location, charger capacity, pricing, and generate bookable slots.</p>
          </div>
          <Link to="/owner/stations/new" className="glass-btn-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-center">Add Station</Link>
        </div>
      )}

      {stationNeedingSetup && (
        <div className="glass-panel p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-yellow-400">Station setup needs attention</div>
            <div className="text-xs text-white/50">{stationNeedingSetup.name} has no charger capacity configured.</div>
          </div>
          <Link to={`/owner/stations/${stationNeedingSetup._id}/edit`} className="glass-btn px-4 py-2 text-xs">Configure</Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="glass-panel p-6 rounded-2xl border border-white/10 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">Live Operations</h2>
            <Link to="/owner/operations" className="text-[10px] font-bold text-primary-light uppercase tracking-widest">View Bookings</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest text-[10px]">
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Station</th>
                  <th className="pb-3">Slot</th>
                  <th className="pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 8).map((booking) => (
                  <tr key={booking._id} className="border-b border-white/5">
                    <td className="py-3 font-bold">{booking.userId?.name || 'Customer'}</td>
                    <td className="py-3 text-white/60">{booking.stationId?.name || booking.meta?.stationName || '-'}</td>
                    <td className="py-3 text-white/50 font-mono text-xs">{bookingStart(booking) ? new Date(bookingStart(booking)).toLocaleString() : '-'}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded-md border text-[9px] font-bold uppercase ${statusClass(booking.status)}`}>{booking.status}</span>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && !loading && (
                  <tr><td colSpan="4" className="py-10 text-center text-white/40">No bookings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">Stations</h2>
            <Link to="/owner/stations" className="text-[10px] font-bold text-primary-light uppercase tracking-widest">Manage</Link>
          </div>
          <div className="space-y-3">
            {stations.slice(0, 6).map((station) => (
              <div key={station._id} className="bg-white/5 border border-white/5 rounded-xl p-3">
                <div className="flex justify-between gap-3">
                  <div className="font-bold text-sm truncate">{station.name}</div>
                  <span className={`text-[9px] px-2 py-0.5 rounded border ${station.status === 'Maintenance' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 'text-primary-light border-primary/30 bg-primary/10'}`}>{station.status || 'Active'}</span>
                </div>
                <div className="text-[10px] text-white/40 truncate mt-1">{stationAddress(station)}</div>
              </div>
            ))}
            {stations.length === 0 && <div className="text-sm text-white/40">No stations registered.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
