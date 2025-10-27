// src/pages/owner/OwnerBookings.jsx
import React, { useEffect, useState } from 'react';
import API from '../../api';
// import { socket, joinSocket } from '../../socket';

export default function OwnerBookings() {
  const [list, setList] = useState([]);
  useEffect(() => {
    async function load() {
      const res = await API.get('/owner/bookings');
      setList(res.data);
    }
    load();

    // ensure socket connected & joined (call after auth)
    // assume you saved user in localStorage localUser
    const token = localStorage.getItem('token');
    // decode token or call API to get user info; here assume you stored userId/role separately
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.id) joinSocket(user.id, user.role || 'owner');

    socket.on('booking:new', (b) => {
      // prepend incoming booking
      setList(prev => [b, ...prev]);
      // optionally show toast
      alert(`New booking from user for ${b.stationName}`);
    });

    socket.on('booking:update', (payload) => {
      setList(prev => prev.map(x => (x._id === payload.bookingId ? { ...x, status: payload.status } : x)));
    });

    return () => {
      socket.off('booking:new');
      socket.off('booking:update');
    };
  }, []);

  async function respond(id, action) {
    try {
      await API.put(`/owner/bookings/${id}/respond`, { action });
      setList(prev => prev.map(b => (b._id === id ? { ...b, status: action === 'accept' ? 'accepted' : 'rejected' } : b)));
    } catch (err) {
      alert('Action failed');
    }
  }

  return (
    <div>
      <h2>Incoming Bookings</h2>
      {list.map(b => (
        <div key={b._id} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8 }}>
          <div><b>{b.stationName}</b> — {new Date(b.createdAt).toLocaleString()}</div>
          <div>Slot: {b.start ? new Date(b.start).toLocaleString() : '—'}</div>
          <div>Status: {b.status}</div>
          {b.status === 'pending' && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => respond(b._id, 'accept')} className="btn">Accept</button>
              <button onClick={() => respond(b._id, 'reject')} className="btn btn-ghost" style={{ marginLeft: 8 }}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
