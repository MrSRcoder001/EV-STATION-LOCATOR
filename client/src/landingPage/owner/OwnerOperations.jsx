import React, { useEffect, useMemo, useState } from 'react';
import API from '../../api';
import toast from 'react-hot-toast';
import { bookingStart, formatCurrency, statusClass } from './ownerUtils';

export default function OwnerOperations() {
  const [bookings, setBookings] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    try {
      const res = await API.get('/owner/bookings');
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const loadEmergencies = async () => {
    try {
      const res = await API.get('/emergency/owner');
      setEmergencies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Failed to load emergency requests', err);
    }
  };

  useEffect(() => {
    loadBookings();
    loadEmergencies();
    const socket = API.getSocket?.();
    const onNewBooking = () => {
      toast.success('New booking request received');
      loadBookings();
    };
    socket?.on?.('booking:new', onNewBooking);
    const onEmergency = () => {
      toast.error('Emergency charging request received');
      loadEmergencies();
    };
    socket?.on?.('emergency:new', onEmergency);
    return () => {
      socket?.off?.('booking:new', onNewBooking);
      socket?.off?.('emergency:new', onEmergency);
    };
  }, []);

  const decide = async (bookingId, action) => {
    try {
      await API.put(`/owner/bookings/${bookingId}/decision`, { action });
      setBookings((prev) => prev.map((booking) => (
        booking._id === bookingId ? { ...booking, status: action === 'accept' ? 'accepted' : 'rejected' } : booking
      )));
      toast.success(action === 'accept' ? 'Booking accepted' : 'Booking rejected');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Decision failed');
    }
  };

  const checkIn = async (booking) => {
    const qrCode = window.prompt('Scan / enter QR code', booking.qrCode || '');
    if (!qrCode) return;
    try {
      const res = await API.post('/sessions/check-in', { bookingId: booking._id, qrCode });
      setBookings((prev) => prev.map((item) => item._id === booking._id ? res.data.booking : item));
      toast.success('Session started');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const completeSession = async (booking) => {
    const meterEndKwh = Number(window.prompt('Final meter kWh', String(booking.meterCurrentKwh || booking.meterStartKwh || 0)));
    if (!Number.isFinite(meterEndKwh)) return toast.error('Enter valid kWh');
    try {
      const res = await API.put(`/sessions/${booking._id}/complete`, { meterEndKwh });
      setBookings((prev) => prev.map((item) => item._id === booking._id ? res.data.booking : item));
      toast.success('Session completed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Completion failed');
    }
  };

  const updateEmergency = async (id, status) => {
    try {
      const res = await API.put(`/emergency/${id}/status`, { status });
      setEmergencies((prev) => prev.map((item) => item._id === id ? res.data : item));
      toast.success('Emergency status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Emergency update failed');
    }
  };

  const visibleBookings = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((booking) => booking.status === filter);
  }, [bookings, filter]);

  const counts = bookings.reduce((acc, booking) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['pending', 'Pending'],
          ['accepted', 'Accepted'],
          ['rejected', 'Rejected'],
          ['completed', 'Completed'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`glass-panel p-4 rounded-2xl border text-left ${filter === key ? 'border-primary/50 bg-primary/10' : 'border-white/10'}`}>
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{label}</div>
            <div className="text-2xl font-black mt-1">{counts[key] || 0}</div>
          </button>
        ))}
      </div>

      <section className="glass-panel p-6 rounded-2xl border border-white/10 min-h-[calc(100vh-260px)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black">Booking Operations</h2>
            <p className="text-xs text-white/40 mt-1">Accept bookings, track customer history, and monitor charging sessions.</p>
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            {['all', 'pending', 'accepted', 'rejected'].map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={`px-3 py-2 rounded-lg text-xs font-bold capitalize ${filter === item ? 'bg-primary text-slate-950' : 'text-white/50'}`}>{item}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest text-[10px]">
                <th className="pb-4 pl-4">Customer</th>
                <th className="pb-4">Station</th>
                <th className="pb-4">Slot</th>
                <th className="pb-4 text-center">Payment</th>
                <th className="pb-4 text-center">Amount</th>
                <th className="pb-4 text-center">Status</th>
                <th className="pb-4 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleBookings.map((booking) => (
                <tr key={booking._id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-4 pl-4">
                    <div className="font-bold">{booking.userId?.name || 'Customer'}</div>
                    <div className="text-[10px] text-white/40">{booking.userId?.email || booking.userId?.phone || '-'}</div>
                  </td>
                  <td className="py-4 text-white/70">{booking.stationId?.name || booking.meta?.stationName || '-'}</td>
                  <td className="py-4 text-white/50 font-mono text-xs">{bookingStart(booking) ? new Date(bookingStart(booking)).toLocaleString() : '-'}</td>
                  <td className="py-4 text-center text-xs uppercase">{booking.paymentStatus || 'pending'}</td>
                  <td className="py-4 text-center font-bold">{formatCurrency(booking.amount)}</td>
                  <td className="py-4 text-center">
                    <span className={`px-2 py-1 rounded-md border text-[9px] font-bold uppercase ${statusClass(booking.status)}`}>{booking.status}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex justify-end gap-2">
                      <button disabled={booking.status !== 'pending'} onClick={() => decide(booking._id, 'accept')} className="glass-btn-primary px-3 py-1.5 text-xs disabled:opacity-30">Accept</button>
                      <button disabled={booking.status !== 'pending'} onClick={() => decide(booking._id, 'reject')} className="glass-btn px-3 py-1.5 text-xs text-red-400 disabled:opacity-30">Reject</button>
                      <button disabled={booking.status !== 'accepted'} onClick={() => checkIn(booking)} className="glass-btn px-3 py-1.5 text-xs text-blue-300 disabled:opacity-30">Check In</button>
                      <button disabled={booking.status !== 'active'} onClick={() => completeSession(booking)} className="glass-btn px-3 py-1.5 text-xs text-primary-light disabled:opacity-30">Complete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleBookings.length === 0 && !loading && (
                <tr><td colSpan="7" className="py-12 text-center text-white/40">No bookings for this filter.</td></tr>
              )}
              {loading && (
                <tr><td colSpan="7" className="py-12 text-center text-white/40">Loading bookings...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel p-6 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black">Emergency Charging Requests</h2>
            <p className="text-xs text-white/40 mt-1">Assigned urgent requests from nearby EV users.</p>
          </div>
          <button onClick={loadEmergencies} className="glass-btn px-4 py-2 text-xs">Refresh</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {emergencies.map((request) => (
            <div key={request._id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-bold">{request.userId?.name || 'EV User'}</div>
                  <div className="text-[10px] text-white/40">{request.userId?.phone || request.address || '-'}</div>
                </div>
                <span className={`h-fit px-2 py-1 rounded border text-[9px] uppercase font-bold ${request.priority === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' : request.priority === 'high' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-white/10 text-white/60 border-white/20'}`}>{request.priority}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                <div className="bg-black/20 rounded-lg p-2"><div className="text-white/30 text-[9px] uppercase">Battery</div><div className="font-bold">{request.batteryPercent}%</div></div>
                <div className="bg-black/20 rounded-lg p-2"><div className="text-white/30 text-[9px] uppercase">Connector</div><div className="font-bold">{request.connectorType}</div></div>
                <div className="bg-black/20 rounded-lg p-2"><div className="text-white/30 text-[9px] uppercase">Status</div><div className="font-bold capitalize">{request.status}</div></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => updateEmergency(request._id, 'on_the_way')} className="glass-btn-primary px-3 py-2 text-xs flex-1">On Way</button>
                <button onClick={() => updateEmergency(request._id, 'resolved')} className="glass-btn px-3 py-2 text-xs flex-1 text-primary-light">Resolved</button>
              </div>
            </div>
          ))}
          {emergencies.length === 0 && <div className="text-white/40 text-sm">No assigned emergency requests.</div>}
        </div>
      </section>
    </div>
  );
}
