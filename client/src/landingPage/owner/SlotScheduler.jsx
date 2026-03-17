// client/src/landingPage/owner/SlotScheduler.jsx
import React, { useState } from "react";
import API from "../../api";
import toast from 'react-hot-toast';

export default function SlotScheduler({ stationId }) {
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [daysAhead, setDaysAhead] = useState(7);
  const [regenerate, setRegenerate] = useState(false);
  const [loading, setLoading] = useState(false);

  async function generate(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await API.post(`/owner/stations/${stationId}/slots`, {
        slotMinutes,
        startHour,
        endHour,
        daysAhead,
        regenerate,
      });
      toast.success(`Time slots generated: ${res.data.total} slots created`);
    } catch (err) {
      toast.error("Failed to generate slots");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel p-6 border-primary/10">
      <div className="mb-6 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
        <h3 className="font-black text-sm uppercase tracking-widest italic">Availability Scheduler</h3>
      </div>
      <form onSubmit={generate} className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] text-white/30 font-black uppercase tracking-widest block ml-1">Interval (m)</label>
            <select
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(Number(e.target.value))}
              className="glass-input w-full p-2 text-xs appearance-none"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-white/30 font-black uppercase tracking-widest block ml-1">START HOUR</label>
            <input
              type="number"
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="glass-input w-full p-2 text-xs"
              min={0}
              max={23}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-white/30 font-black uppercase tracking-widest block ml-1">END HOUR</label>
            <input
              type="number"
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="glass-input w-full p-2 text-xs"
              min={1}
              max={24}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-white/30 font-black uppercase tracking-widest block ml-1">Horizon (d)</label>
            <input
              type="number"
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              className="glass-input w-full p-2 text-xs"
              min={1}
              max={30}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
          <input
            type="checkbox"
            checked={regenerate}
            id="regen"
            onChange={(e) => setRegenerate(e.target.checked)}
            className="w-4 h-4 rounded border-white/10 bg-white/5 accent-primary"
          />
          <label htmlFor="regen" className="text-[10px] font-bold text-white/50 cursor-pointer select-none">
            Overwrite Existing Slots: This will replace all future available slots
          </label>
        </div>

        <button className="glass-btn-primary w-full py-3 text-[10px] font-black tracking-widest uppercase disabled:grayscale" disabled={loading}>
          {loading ? "Generating..." : "Generate Time Slots"}
        </button>
      </form>
    </div>
  );
}
