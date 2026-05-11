import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api';
import toast from 'react-hot-toast';
import { formatCurrency, stationAddress } from './ownerUtils';

export default function OwnerStations() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStations = async () => {
    try {
      const res = await API.get('/owner/stations');
      setStations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load stations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const updateStatus = async (station, status) => {
    try {
      const payload = {
        ...station,
        status,
        lat: station.location?.coordinates?.[1],
        lng: station.location?.coordinates?.[0],
      };
      await API.put(`/owner/stations/${station._id}`, payload);
      setStations((prev) => prev.map((item) => item._id === station._id ? { ...item, status } : item));
      toast.success('Station status updated');
    } catch (err) {
      toast.error('Status update failed');
    }
  };

  const regenerateSlots = async (stationId) => {
    try {
      await API.post(`/owner/stations/${stationId}/slots`, { regenerate: true, slotMinutes: 60, daysAhead: 7 });
      toast.success('Slots regenerated for next 7 days');
    } catch (err) {
      toast.error('Could not regenerate slots');
    }
  };

  const deleteStation = async (stationId) => {
    if (!window.confirm('Delete this station?')) return;
    try {
      await API.delete(`/owner/stations/${stationId}`);
      setStations((prev) => prev.filter((station) => station._id !== stationId));
      toast.success('Station deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10 min-h-[calc(100vh-140px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black">Station Management</h2>
          <p className="text-xs text-white/40 mt-1">Registration, charger capacity, pricing, and maintenance controls.</p>
        </div>
        <Link to="/owner/stations/new" className="glass-btn-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-center">Add Station</Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest text-[10px]">
              <th className="pb-4 pl-4">Station</th>
              <th className="pb-4">Location</th>
              <th className="pb-4 text-center">Capacity</th>
              <th className="pb-4 text-center">Price</th>
              <th className="pb-4 text-center">Status</th>
              <th className="pb-4 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => {
              const capacity = (station.chargers || []).reduce((sum, charger) => sum + Number(charger.count || charger.chargerCount || 1), 0);
              return (
                <tr key={station._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 pl-4">
                    <div className="font-bold">{station.name}</div>
                    <div className="text-[10px] text-white/40 font-mono mt-1">{station._id}</div>
                  </td>
                  <td className="py-4 text-white/60 text-xs max-w-[260px] truncate">{stationAddress(station)}</td>
                  <td className="py-4 text-center">
                    <div className="font-black text-lg">{capacity}</div>
                    <div className="text-[9px] text-white/30 uppercase">{station.chargers?.length || 0} charger groups</div>
                  </td>
                  <td className="py-4 text-center font-bold">{formatCurrency(station.pricePerKwh || station.pricing?.basePrice || 0)}</td>
                  <td className="py-4 text-center">
                    <select value={station.status || 'Active'} onChange={(e) => updateStatus(station, e.target.value)} className="glass-input text-xs py-1.5 px-2">
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex justify-end gap-2 text-xs">
                      <Link to={`/owner/stations/${station._id}/edit`} className="glass-btn px-3 py-1.5">Edit</Link>
                      <button onClick={() => regenerateSlots(station._id)} className="glass-btn px-3 py-1.5 text-yellow-400">Slots</button>
                      <button onClick={() => deleteStation(station._id)} className="glass-btn px-3 py-1.5 text-red-400">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {stations.length === 0 && !loading && (
              <tr><td colSpan="6" className="py-12 text-center text-white/40">No owner stations found.</td></tr>
            )}
            {loading && (
              <tr><td colSpan="6" className="py-12 text-center text-white/40">Loading stations...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
