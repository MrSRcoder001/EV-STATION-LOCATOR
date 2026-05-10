// client/src/landingPage/owner/StationForm.jsx
import React, { useEffect, useState } from "react";
import API from "../../api";
import { useNavigate, useParams } from "react-router-dom";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import toast from 'react-hot-toast';
export default function AdminStationForm() {
  const { isLoaded } = useJsApiLoader({ id: "google-map-script", googleMapsApiKey: "AIzaSyDZG_Bf3bqCrV6VnNykIVX3QeRjrTCpGbA" });
  const { id } = useParams();
  const editMode = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    address: {
      city: "",
      pincode: "",
      village: "",
      area: "",
      fullAddress: "",
    },
    phone: "",
    email: "",
    type: "Public",
    pricePerKwh: "",
    basePrice: 15,
    peakMultiplier: 1.5,
    status: "Active",
    openTime: "06:00",
    closeTime: "22:00",
    lat: 18.5204,
    lng: 73.8567,
    chargers: [{ type: "AC", powerKw: "", chargerCount: 1, pricePerKwh: "", isActive: true }],
    amenities: [],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editMode) {
      (async () => {
        try {
          setLoading(true);
          const res = await API.get(`/owner/stations/${id}`);
          const s = res.data;
          setForm({
            name: s.name || "",
            address: {
              city: s.address?.city || "",
              pincode: s.address?.pincode || "",
              village: s.address?.village || "",
              area: s.address?.area || "",
              fullAddress: s.address?.fullAddress || "",
            },
            phone: s.phone || "",
            email: s.email || "",
            type: s.type || "Public",
            pricePerKwh: s.pricePerKwh || "",
            basePrice: s.pricing?.basePrice || 15,
            peakMultiplier: s.pricing?.peakMultiplier || 1.5,
            status: s.status || "Active",
            openTime: s.openTime || "06:00",
            closeTime: s.closeTime || "22:00",
            lat: s.location?.coordinates?.[1] || 18.5204,
            lng: s.location?.coordinates?.[0] || 73.8567,
            chargers: s.chargers?.length ? s.chargers.map(c => ({
              type: c.type || "AC",
              powerKw: c.powerKw ?? "",
              chargerCount: c.chargerCount ?? 1,
              pricePerKwh: c.pricePerKwh ?? "",
              isActive: c.isActive ?? true
            })) : [{ type: "AC", powerKw: "", chargerCount: 1, pricePerKwh: "", isActive: true }],
            amenities: s.amenities || [],
          });
        } catch (err) {
          toast.error("Failed to load station");
          navigate("/admin/stations");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, editMode, navigate]);

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function onAddressChange(e) {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [e.target.name]: e.target.value }
    }));
  }

  async function geocodeAddress() {
    const { city, pincode, village, area, fullAddress } = form.address;
    const query = [fullAddress, area, village, city, pincode].filter(Boolean).join(', ');
    if (!query.trim()) {
      toast.error("Please fill address fields");
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=IN&limit=1`);
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        setForm((prev) => ({ ...prev, lat: Number(lat), lng: Number(lon) }));
        toast.success("Location identified!");
      } else {
        toast.error("Location not found");
      }
    } catch (err) {
      toast.error("Geocoding failed");
    }
  }

  function updateCharger(idx, key, value) {
    setForm(prev => {
      const chargers = [...prev.chargers];
      chargers[idx] = { ...chargers[idx], [key]: value };
      return { ...prev, chargers };
    });
  }

  function addCharger() {
    setForm(prev => ({
      ...prev,
      chargers: [...prev.chargers, { type: "AC", powerKw: "", chargerCount: 1, pricePerKwh: "", isActive: true }]
    }));
  }

  function removeCharger(idx) {
    setForm(prev => ({
      ...prev,
      chargers: prev.chargers.filter((_, i) => i !== idx)
    }));
  }

  async function handleRegenerateSlots() {
    if (!window.confirm("This will overwrite existing free slots for this station. Continue?")) return;
    try {
      setLoading(true);
      await API.post(`/owner/stations/${encodeURIComponent(id)}/slots`, { regenerate: true });
      toast.success("Availability updated successfully");
    } catch (err) {
      toast.error("Failed to update availability");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...form,
        lng: Number(form.lng),
        pricing: {
          basePrice: Number(form.basePrice) || 0,
          peakMultiplier: Number(form.peakMultiplier) || 1,
        },
        status: form.status || "Active",
        chargers: form.chargers.map(c => ({
          ...c,
          powerKw: Number(c.powerKw) || 0,
          chargerCount: Number(c.chargerCount) || 1,
          pricePerKwh: Number(c.pricePerKwh) || 0,
          isActive: Boolean(c.isActive)
        }))
      };
      if (editMode) {
        await API.put(`/owner/stations/${id}`, payload);
        toast.success("Station instance updated");
      } else {
        await API.post("/owner/stations", payload);
        toast.success("Property registered successfully");
      }
      navigate("/admin/stations");
    } catch (err) {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  }

  const amenitiesList = ["Parking", "Restroom", "Food Court", "WiFi", "Shop"];

  return (
    <div className="glass-panel p-8">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">
          {editMode ? "Terminal Configuration" : "New Property Registry"}
        </h2>
        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Satellite System Interface</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Identity Section */}
          <section className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2 ml-1">Station Designation</label>
              <input name="name" value={form.name} onChange={onChange} required className="glass-input w-full" placeholder="e.g. GreenCharge Alpha" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2 ml-1">Support Email</label>
              <input name="email" value={form.email} onChange={onChange} type="email" className="glass-input w-full md:w-3/4" placeholder="support@station.com" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2 ml-1">Direct Contact</label>
              <input name="phone" value={form.phone} onChange={onChange} className="glass-input w-full md:w-3/4" placeholder="+91 000 000 0000" />
            </div>
          </section>

          {/* Type & Time section */}
          <section className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2 ml-1">Category & Status</label>
              <div className="flex gap-3">
                <select name="type" value={form.type} onChange={onChange} className="glass-input flex-1 appearance-none">
                  <option value="Public">Public</option>
                  <option value="Private">Private</option>
                </select>
                <select name="status" value={form.status} onChange={onChange} className="glass-input flex-1 appearance-none">
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2 ml-1">Window of Operation</label>
              <div className="flex items-center gap-3">
                <input type="time" name="openTime" value={form.openTime} onChange={onChange} className="glass-input flex-1" />
                <span className="text-white/20 text-xs text-glow-primary">TO</span>
                <input type="time" name="closeTime" value={form.closeTime} onChange={onChange} className="glass-input flex-1" />
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2 ml-1">Dynamic Pricing Settings</label>
              <div className="flex items-center gap-3">
                <div className="flex-[2]">
                  <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest block mb-1">Base Price / kWh</label>
                  <input type="number" name="basePrice" value={form.basePrice} onChange={onChange} className="glass-input w-full" placeholder="e.g. 15" />
                </div>
                <div className="flex-[1]">
                  <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest block mb-1">Peak Mult</label>
                  <input type="number" step="0.1" name="peakMultiplier" value={form.peakMultiplier} onChange={onChange} className="glass-input w-full" placeholder="e.g. 1.5" />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Address Mapping */}
        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2 ml-1">Geographic Metadata</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input name="fullAddress" value={form.address.fullAddress} onChange={onAddressChange} placeholder="Full Physical Address" className="glass-input w-full" />
            </div>
            <input name="city" value={form.address.city} onChange={onAddressChange} placeholder="City / District" required className="glass-input" />
            <input name="pincode" value={form.address.pincode} onChange={onAddressChange} placeholder="Postal Code" className="glass-input" />
          </div>
          <button type="button" onClick={geocodeAddress} className="text-[10px] font-bold text-primary-light hover:text-white uppercase tracking-tighter flex items-center gap-2 mt-2">
            📡 Sync Location from Address
          </button>
        </div>

        {/* Charger Management */}
        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-6">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Charging Units</label>
            <button type="button" className="text-[10px] font-bold text-primary-light hover:underline uppercase" onClick={addCharger}>+ Add Charger</button>
          </div>

          <div className="space-y-4">
            {form.chargers.map((c, idx) => (
              <div key={idx} className="glass-panel p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end group relative">
                <div>
                  <label className="text-[8px] text-white/20 font-bold uppercase mb-1 block">Type</label>
                  <select value={c.type} onChange={(e) => updateCharger(idx, "type", e.target.value)} className="glass-input w-full p-2 text-xs appearance-none">
                    <option value="AC">AC</option>
                    <option value="DC">DC</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8px] text-white/20 font-bold uppercase mb-1 block">Power (kW)</label>
                  <input type="number" value={c.powerKw ?? ""} onChange={(e) => updateCharger(idx, "powerKw", e.target.value)} className="glass-input w-full p-2 text-xs" placeholder="e.g. 50" />
                </div>
                <div>
                  <label className="text-[8px] text-white/20 font-bold uppercase mb-1 block">Count</label>
                  <input type="number" value={c.chargerCount ?? 1} min={1} onChange={(e) => updateCharger(idx, "chargerCount", e.target.value)} className="glass-input w-full p-2 text-xs" />
                </div>
                <div>
                  <label className="text-[8px] text-white/20 font-bold uppercase mb-1 block">Price / kWh</label>
                  <input type="number" value={c.pricePerKwh ?? ""} onChange={(e) => updateCharger(idx, "pricePerKwh", e.target.value)} className="glass-input w-full p-2 text-xs" placeholder="e.g. 20" />
                </div>
                <div className="md:col-span-1 col-span-2 flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input type="checkbox" className="hidden" checked={c.isActive} onChange={(e) => updateCharger(idx, "isActive", e.target.checked)} />
                    <span className={`w-3 h-3 rounded-sm flex items-center justify-center border ${c.isActive ? 'bg-primary border-primary text-slate-900' : 'border-white/20 bg-white/5'}`}>
                      {c.isActive && "✔"}
                    </span>
                    <span className="text-[8px] font-bold uppercase text-white/40">{c.isActive ? 'Active' : 'Disabled'}</span>
                  </label>
                  <button
                    type="button"
                    className="w-full py-2.5 text-[10px] font-bold text-red-500/40 hover:text-red-400 glass-panel border-none group-hover:bg-red-500/5 transition-colors"
                    onClick={() => removeCharger(idx)}
                    disabled={form.chargers.length <= 1}
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities Selection */}
        <div className="py-6 border-y border-white/5">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-4 ml-1">On-Site Amenities</label>
          <div className="flex flex-wrap gap-3">
            {amenitiesList.map((am) => (
              <label key={am} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${form.amenities.includes(am) ? "bg-primary/20 border-primary text-primary-light" : "bg-white/5 border-white/5 opacity-40 hover:opacity-100"}`}>
                <input
                  type="checkbox"
                  checked={form.amenities.includes(am)}
                  className="hidden"
                  onChange={(e) => {
                    const newAmenities = e.target.checked
                      ? [...form.amenities, am]
                      : form.amenities.filter((a) => a !== am);
                    setForm((prev) => ({ ...prev, amenities: newAmenities }));
                  }}
                />
                <span>{am}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Satellite Map Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[400px] rounded-3xl overflow-hidden border border-white/10 glass-panel shadow-2xl relative">
            {isLoaded ? (
              <GoogleMap
                center={{ lat: form.lat, lng: form.lng }}
                zoom={13}
                mapContainerStyle={{ height: "100%", width: "100%" }}
                options={{ streetViewControl: false }}
              >
                <MarkerF
                  position={{ lat: form.lat, lng: form.lng }}
                  draggable={true}
                  onDragEnd={(e) => {
                    setForm(prev => ({ ...prev, lat: e.latLng.lat(), lng: e.latLng.lng() }));
                  }}
                />
              </GoogleMap>
            ) : (
              <div className="flex items-center justify-center w-full h-full text-white/50">Loading Map...</div>
            )}
            <div className="absolute top-4 right-4 z-[1000] glass-panel px-4 py-2 text-[10px] font-bold bg-slate-900/80">Satellite Live</div>
          </div>

          <div className="lg:col-span-1 space-y-4 flex flex-col justify-center">
            <div className="p-4 glass-panel border-white/5">
              <label className="text-[8px] font-bold text-white/40 uppercase tracking-widest block mb-1">Latitude</label>
              <input type="number" step="any" name="lat" value={form.lat} onChange={onChange} className="bg-transparent text-white font-mono text-lg outline-none w-full" />
            </div>
            <div className="p-4 glass-panel border-white/5">
              <label className="text-[8px] font-bold text-white/40 uppercase tracking-widest block mb-1">Longitude</label>
              <input type="number" step="any" name="lng" value={form.lng} onChange={onChange} className="bg-transparent text-white font-mono text-lg outline-none w-full" />
            </div>
          </div>
        </div>

        {/* Final Actions */}
        <div className="flex gap-4 pt-10 border-t border-white/5">
          <button type="button" onClick={() => navigate("/admin/stations")} className="glass-btn flex-1 py-4 font-bold uppercase tracking-widest text-xs">Cancel</button>
          <button className="glass-btn-primary flex-[2] py-4 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 disabled:grayscale disabled:opacity-50" disabled={loading}>
            {loading ? "Processing..." : editMode ? "Save Settings" : "Register Station"}
          </button>
          {editMode && (
            <button type="button" className="glass-btn px-6 py-4 font-black uppercase tracking-widest text-[9px] text-yellow-500/60 border-yellow-500/20 hover:text-yellow-500 transition-colors" onClick={handleRegenerateSlots}>
              Update Availability
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
