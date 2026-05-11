import React, { useEffect, useState } from 'react';
import API from '../../api';
import toast from 'react-hot-toast';
import { formatCurrency } from './ownerUtils';

export default function OwnerAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await API.get('/owner/bookings/analytics');
        setAnalytics(res.data || null);
      } catch (err) {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hourly = analytics?.hourlyUsage || [];
  const maxBookings = Math.max(1, ...hourly.map((item) => item.bookings || 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Revenue Dashboard</div>
          <div className="text-3xl font-black mt-2">{formatCurrency(analytics?.revenue)}</div>
          <div className="text-[10px] text-primary-light font-bold mt-1">{Number(analytics?.totalKwh || 0).toFixed(1)} kWh delivered</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Peak Hour Trend</div>
          <div className="text-3xl font-black mt-2">{analytics?.peakHour ? `${analytics.peakHour.hour}:00` : '-'}</div>
          <div className="text-[10px] text-primary-light font-bold mt-1">{analytics?.peakHour?.bookings || 0} bookings</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Occupancy Rate</div>
          <div className="text-3xl font-black mt-2">{analytics?.occupancyRate || 0}%</div>
          <div className="text-[10px] text-primary-light font-bold mt-1">{analytics?.bookedSlots || 0}/{analytics?.totalSlots || 0} future slots booked</div>
        </div>
      </div>

      <section className="glass-panel p-6 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black">Peak Hour Trends</h2>
            <p className="text-xs text-white/40 mt-1">Bookings grouped by slot start hour.</p>
          </div>
        </div>
        <div className="h-64 bg-white/5 border border-white/5 rounded-xl p-4 flex items-end gap-2">
          {hourly.map((item) => (
            <div key={item.hour} className="flex-1 h-full flex flex-col justify-end gap-2">
              <div
                title={`${item.hour}:00 - ${item.bookings} bookings`}
                className="w-full bg-gradient-to-t from-primary/40 to-primary rounded-t-sm min-h-[4px]"
                style={{ height: `${Math.max(4, ((item.bookings || 0) / maxBookings) * 100)}%` }}
              />
              <div className="text-[8px] text-white/30 text-center">{item.hour % 6 === 0 ? item.hour : ''}</div>
            </div>
          ))}
          {!analytics && !loading && <div className="text-white/40">No analytics available.</div>}
        </div>
      </section>

      <section className="glass-panel p-6 rounded-2xl border border-white/10">
        <h2 className="text-xl font-black mb-5">Station Revenue</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest text-[10px]">
                <th className="pb-4 pl-4">Station</th>
                <th className="pb-4 text-center">Bookings</th>
                <th className="pb-4 text-center">Energy</th>
                <th className="pb-4 text-right pr-4">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.stationPerformance || []).map((station) => (
                <tr key={station.stationId || station.name} className="border-b border-white/5">
                  <td className="py-4 pl-4 font-bold">{station.name}</td>
                  <td className="py-4 text-center">{station.bookings}</td>
                  <td className="py-4 text-center">{Number(station.kwh || 0).toFixed(1)} kWh</td>
                  <td className="py-4 text-right pr-4 font-bold">{formatCurrency(station.revenue)}</td>
                </tr>
              ))}
              {(analytics?.stationPerformance || []).length === 0 && !loading && (
                <tr><td colSpan="4" className="py-12 text-center text-white/40">No revenue data yet.</td></tr>
              )}
              {loading && (
                <tr><td colSpan="4" className="py-12 text-center text-white/40">Loading analytics...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
