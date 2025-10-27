// client/src/components/StationSlots.jsx
import React, { useEffect, useState } from 'react';
import API from "../../api";
import BookingModal from './BookingModal';

export default function StationSlots({ stationId, stationName }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  async function loadSlots() {
    try {
      setLoading(true);
      setError(null);
      // default: from now, next 7 days
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await API.get(`/stations/${encodeURIComponent(stationId)}/slots`, {
        params: { from, to, onlyFree: true, limit: 200 }
      });
      setSlots(res.data || []);
    } catch (err) {
      console.error('loadSlots err', err);
      setError(err.response?.data?.message || err.message || 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!stationId) return;
    loadSlots();
    // eslint-disable-next-line
  }, [stationId]);

  const onBooked = (booking, bookedSlotId) => {
    // remove the booked slot from UI
    setSlots(prev => prev.filter(s => String(s._id) !== String(bookedSlotId)));
    setShowModal(false);
    alert('Booking confirmed!');
  };

  const handleOpen = (slot) => {
    setSelectedSlot(slot);
    setShowModal(true);
  };

  if (loading) return <div>Loading slots…</div>;
  if (error) return <div style={{ color: 'crimson' }}>{error}</div>;

  return (
    <div>
      <h4>Available slots</h4>
      {slots.length === 0 ? (
        <div className="muted">No free slots available — try different date or contact owner</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {slots.map(slot => (
            <div key={slot._id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderRadius: 8, border: '1px solid #eee' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{new Date(slot.start).toLocaleString()}</div>
                <div style={{ fontSize: 13 }}>{slot.chargerType} • Charger #{slot.chargerIndex + 1}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn" onClick={() => handleOpen(slot)}>Book</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedSlot && (
        <BookingModal
          stationId={stationId}
          stationName={stationName}
          slot={selectedSlot}
          onClose={() => setShowModal(false)}
          onBooked={onBooked}
          onConflict={() => loadSlots()} // refresh list on conflict
        />
      )}
    </div>
  );
}
