// client/src/landingPage/owner/StationList.jsx
import React, { useEffect, useState } from "react";
import API from "../../api";
import { Link } from "react-router-dom";
import toast from 'react-hot-toast';

export default function StationList() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await API.get("/owner/stations");
      setStations(res.data);
    } catch (err) {
      toast.error("Failed to load stations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    if (!window.confirm("Delete this station?")) return;
    try {
      await API.delete(`/owner/stations/${id}`);
      toast.success("Station deleted successfully");
      setStations(stations.filter((s) => s._id !== id));
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="glass-panel p-8">
      <div className="flex justify-between items-center mb-8 pb-8 border-b border-white/5">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic">My Stations</h2>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Manage your charging points</p>
        </div>
        <Link to="/owner/stations/new" className="glass-btn-primary px-6 py-2.5 text-xs">
          Add New Station
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-primary-light font-bold uppercase tracking-widest italic">Loading stations...</div>
      ) : stations.length === 0 ? (
        <div className="py-20 text-center glass-panel border-dashed border-white/10">
          <p className="text-white/20 italic mb-6">No stations added under your account.</p>
          <Link to="/owner/stations/new" className="glass-btn px-8 py-3 text-xs italic">
            Add your first station →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {stations.map((s) => (
            <div key={s._id} className="glass-card group hover:scale-[1.01] overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/30 text-glow-primary">🔌</div>
                    <div>
                      <h3 className="font-black text-lg group-hover:text-primary-light transition-colors">{s.name}</h3>
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest -mt-1">Active Station</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 bg-white/5 rounded-full border border-white/5">ONLINE</span>
                </div>

                <div className="mb-6">
                  <p className="text-xs text-white/40 italic line-clamp-1 mb-2">
                    {[s.address?.fullAddress, s.address?.area, s.address?.village, s.address?.city, s.address?.pincode].filter(Boolean).join(', ')}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-white/20 font-mono">
                    <span className="opacity-40">Location:</span>
                    <span>{s.location?.coordinates?.[1].toFixed(4)}, {s.location?.coordinates?.[0].toFixed(4)}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex gap-3">
                  <Link to={`/owner/stations/${s._id}/edit`} className="flex-1 glass-btn py-2 text-xs text-center">Settings</Link>
                  <button onClick={() => handleDelete(s._id)} className="flex-1 glass-btn py-2 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/10">Remove Station</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
