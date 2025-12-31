// client/src/components/owner/SlotScheduler.jsx
import React, { useState } from "react";
import API from "../../api";

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
      alert(`Done: ${res.data.total} slots queued/generated`);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to generate slots");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #e6efe6",
        padding: 12,
        borderRadius: 8,
        background: "#fbfefb",
      }}
    >
      <h3>Slot Scheduler</h3>
      <form onSubmit={generate} style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <label>Slot (minutes)</label>
          <select
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
          <label>Start hour</label>
          <input
            type="number"
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            min={0}
            max={23}
          />
          <label>End hour</label>
          <input
            type="number"
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
            min={1}
            max={24}
          />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label>Days ahead</label>
          <input
            type="number"
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
            min={1}
            max={30}
          />
          <label>
            <input
              type="checkbox"
              checked={regenerate}
              onChange={(e) => setRegenerate(e.target.checked)}
            />{" "}
            Regenerate (delete future slots)
          </label>
        </div>

        <div>
          <button className="btn" disabled={loading}>
            {loading ? "Generating..." : "Generate Slots"}
          </button>
        </div>
      </form>
    </div>
  );
}
