// client/src/landingPage/component/StationSlots.jsx
import React, { useEffect, useState, useMemo } from 'react';
import API from "../../api";
import BookingModal from './BookingModal';
import toast from 'react-hot-toast';

export default function StationSlots({ stationId, stationName }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);

  async function loadSlots() {
    try {
      setLoading(true);
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await API.get(`/stations/${encodeURIComponent(stationId)}/slots`, {
        params: { from, to, onlyFree: true, limit: 300 }
      });
      setSlots(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load slots");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (stationId) loadSlots();
  }, [stationId]);

  // Group slots by date for better UX
  const groupedSlots = useMemo(() => {
    const groups = {};
    slots.forEach(slot => {
      const dateKey = new Date(slot.start).toLocaleDateString(undefined, {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(slot);
    });
    return groups;
  }, [slots]);

  const onBooked = (booking, bookedSlotId) => {
    setSlots(prev => prev.filter(s => String(s._id) !== String(bookedSlotId)));
    setShowModal(false);
  };

  const handleOpen = (slot) => {
    setSelectedSlot(slot);
    setShowModal(true);
  };

  if (loading) return (
    <div className="py-20 text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 animate-pulse">Checking availability...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-gradient-to-b from-primary to-transparent rounded-full"></div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-tighter">Available Slots</h4>
            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Select a time to book</p>
          </div>
        </div>
        <div className="text-[10px] font-bold text-primary-light bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
          {slots.length} Free
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="py-20 glass-panel border-dashed border-white/10 text-center space-y-3">
          <div className="text-3xl grayscale opacity-20">🚫</div>
          <p className="text-xs text-white/20 italic font-medium">No available slots found. Please check back later.</p>
        </div>
      ) : (
        <div className="relative group">
          {/* Scrollview Gradient Fades */}
          <div className="absolute -top-4 left-0 right-0 h-4 bg-gradient-to-t from-transparent to-[#0f2027] z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute -bottom-4 left-0 right-0 h-4 bg-gradient-to-b from-transparent to-[#0f2027] z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <div className="max-h-[500px] overflow-y-auto pr-4 custom-scrollbar space-y-8">
            {Object.entries(groupedSlots).map(([date, daySlots]) => (
              <div key={date} className="space-y-4">
                <div className="sticky top-0 z-20 py-1 bg-[#0f2027]/80 backdrop-blur-md">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] border-b border-primary/30 pb-0.5">{date}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {daySlots.map(slot => (
                    <div key={slot._id} className="glass-card p-4 flex flex-col justify-between gap-4 group hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-black italic text-white group-hover:text-primary-light transition-colors">
                            <span>{new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="opacity-20">→</span>
                            <span className="opacity-60">{new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-[8px] text-white/20 font-black uppercase tracking-widest">{slot.chargerType} CHARGER</div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-[10px] group-hover:bg-primary/20 transition-colors">
                          #{slot.chargerIndex + 1}
                        </div>
                      </div>

                      <button
                        className="w-full glass-btn-primary py-2 text-[9px] font-black tracking-widest uppercase hover:scale-[1.02] active:scale-95 transition-transform"
                        onClick={() => handleOpen(slot)}
                      >
                        Book Slot
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && selectedSlot && (
        <BookingModal
          stationId={stationId}
          stationName={stationName}
          slot={selectedSlot}
          onClose={() => setShowModal(false)}
          onBooked={onBooked}
          onConflict={() => loadSlots()}
        />
      )}
    </div>
  );
}
