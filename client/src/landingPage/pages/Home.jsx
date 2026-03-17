// client/src/landingPage/pages/Home.jsx
import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";
import L from "leaflet";
import API from "../../api";
import toast from 'react-hot-toast';
// styles handled by index.css and tailwind
// marker icons
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const yellowIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const defaultIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// helper to format address object or string
const formatAddress = (addr) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  return [addr.fullAddress, addr.area, addr.village, addr.city, addr.pincode]
    .filter(Boolean)
    .join(", ");
};

// map DB station doc to unified UI shape
function mapDbStationToUnified(s) {
  const coords = s?.location?.coordinates && Array.isArray(s.location.coordinates)
    ? { lat: s.location.coordinates[1], lng: s.location.coordinates[0] }
    : { lat: 0, lng: 0 };
  const connectors = Array.isArray(s.chargers) && s.chargers.length > 0
    ? s.chargers.map((c) => c.type || "AC")
    : ["AC"];
  const availableSlots = s.availableSlots ?? s.estimatedSlots ?? 0;
  const pricePerKWh = s.pricePerKWh || (s.chargers && s.chargers[0] && s.chargers[0].pricePerKwh) || 0;
  return {
    id: `db_${s._id}`,
    rawId: s._id,
    source: "db",
    name: s.name || s.stationName || "Owner Station",
    address: formatAddress(s.address || s.stationAddress),
    coords,
    connectors,
    availableSlots,
    pricePerKWh,
    original: s,
  };
}

// map OpenChargeMap entry to unified shape
function mapOcmToUnified(s, index) {
  const lat = s?.AddressInfo?.Latitude;
  const lon = s?.AddressInfo?.Longitude;
  const connectors = Array.isArray(s.Connections)
    ? s.Connections.map((c) => c.ConnectionType?.Title || "AC")
    : ["AC"];
  return {
    id: `ocm_${s.ID ?? index}`,
    source: "ocm",
    name: s?.AddressInfo?.Title || "OCM Station",
    address: s?.AddressInfo?.AddressLine1 || s?.AddressInfo?.Town || s?.AddressInfo?.StateOrProvince || "",
    coords: { lat: Number(lat) || 0, lng: Number(lon) || 0 },
    connectors,
    availableSlots: s?.NumberOfPoints ?? 1,
    pricePerKWh: 20,
    original: s,
  };
}

// Sub-component to manage marker popups when shifted/searched
function MarkerController({ activeId, markerId, children }) {
  const markerRef = useRef(null);
  useEffect(() => {
    if (activeId === markerId && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [activeId, markerId]);

  return React.cloneElement(children, { ref: markerRef });
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [bookingSlotsList, setBookingSlotsList] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [searchMarker, setSearchMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [routingControl, setRoutingControl] = useState(null);
  const mapRef = useRef();

  // fetch OpenChargeMap stations
  const fetchOcmStations = async (lat, lon) => {
    try {
      const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&distance=10&maxresults=10&key=c4697cbb-0525-4304-aaf0-4a82496eb8e6`;
      const res = await fetch(url);
      const data = await res.json();
      return data.map((s, i) => mapOcmToUnified(s, i));
    } catch (err) {
      console.error("OCM fetch error:", err);
      return [];
    }
  };

  // fetch owner stations from DB (nearby)
  const fetchDbStations = async (lat, lon) => {
    try {
      const res = await API.get('/stations/nearby', {
        params: { lat, lng: lon, maxDistance: 10000 }
      });
      return res.data.map((s) => mapDbStationToUnified(s));
    } catch (err) {
      console.error("DB stations error:", err);
      return [];
    }
  };

  // merge DB + OCM, dedupe by proximity
  const fetchStations = async (lat, lon) => {
    try {
      const [dbList, ocmList] = await Promise.all([
        fetchDbStations(lat, lon),
        fetchOcmStations(lat, lon),
      ]);
      const merged = [...dbList];
      const isNear = (a, b, threshold = 40) => {
        if (!a || !b) return false;
        const R = 6371000;
        const toRad = (v) => (v * Math.PI) / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLon = toRad(b.lng - a.lng);
        const aCalc = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
        const d = R * c;
        return d <= threshold;
      };
      for (const o of ocmList) {
        const duplicate = merged.some((m) => isNear(m.coords, o.coords, 40));
        if (!duplicate) merged.push(o);
      }
      setStations(merged);
    } catch (err) {
      console.error("fetchStations error", err);
      setStations([]);
    }
  };

  // initial load (Pune)
  useEffect(() => {
    fetchStations(18.5204, 73.8567);
  }, []);

  // search by address/location + local name matching + DB search
  const handleSearch = async () => {
    if (!query || query.trim() === "")
      return toast.error("Enter a location to search");

    const q = query.toLowerCase().trim();

    // 1. Priority: Local Match (indexOf name or address in current list)
    let localMatch = stations.find(s =>
      s.name.toLowerCase().indexOf(q) !== -1 ||
      s.address.toLowerCase().indexOf(q) !== -1
    );

    // 2. Database Search (Database-wide by name/address)
    try {
      const dbRes = await API.get(`/stations/search`, { params: { q: query } });
      const dbMatches = dbRes.data.map(mapDbStationToUnified);

      if (dbMatches.length > 0) {
        // Add new matches to stations if they don't exist
        setStations(prev => {
          const newOnes = dbMatches.filter(m => !prev.some(p => String(p.id) === String(m.id)));
          return [...newOnes, ...prev];
        });

        // If no local match was found yet, use the first DB match
        if (!localMatch) {
          localMatch = dbMatches[0];
        }
      }
    } catch (e) {
      console.warn("DB search failed", e);
    }

    if (localMatch && mapRef.current) {
      mapRef.current.flyTo([localMatch.coords.lat, localMatch.coords.lng], 15, { animate: true, duration: 1.5 });
      setActiveMarkerId(localMatch.id);

      // Move localMatch to the top of the stations array for the sidebar
      setStations(prev => {
        const others = prev.filter(s => String(s.id) !== String(localMatch.id));
        return [localMatch, ...others];
      });

      toast.success(`Focused: ${localMatch.name}`);
      // return here if we found a direct match to avoid global map movement
      return;
    }

    // 3. Global Geographic Search (Nominatim) fallback
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLon = parseFloat(lon);

        setSearchMarker({ lat: newLat, lng: newLon, label: display_name });

        if (mapRef.current) {
          mapRef.current.flyTo([newLat, newLon], 13, { animate: true, duration: 1.2 });
        }

        await fetchStations(newLat, newLon);
      } else {
        toast.error("Location not found");
      }
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Error fetching location");
    }
  };

  const panToUser = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(pos);
        if (mapRef.current)
          mapRef.current.flyTo([pos.lat, pos.lng], 13, { animate: true, duration: 1.2 });
        fetchStations(pos.lat, pos.lng);
      },
      (err) => {
        console.error("geolocation error", err);
        toast.error("Unable to retrieve your location.");
      }
    );
  };

  // open booking modal and fetch slots
  const openBooking = async (station) => {
    setSelectedStation(station);
    setBookingSlot(null);
    setBookingSlotsList([]);
    setShowModal(true);
    if (station.source === "db") {
      setSlotsLoading(true);
      try {
        const from = new Date().toISOString();
        const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
        let stationSlots = [];
        try {
          const resStationSlots = await API.get(`/stations/${encodeURIComponent(station.rawId)}/slots`, { params: { from, to, onlyFree: true } });
          stationSlots = resStationSlots.data.map((sl) => ({
            slotId: sl._id, start: sl.start, end: sl.end, chargerType: sl.chargerType, chargerIndex: sl.chargerIndex, stationId: station.rawId, stationName: station.name, isDemo: !!sl.isDemo,
          }));
        } catch (e) { console.warn("station slots fetch failed", e); }
        let ownerSlots = [];
        try {
          const resOwnerSlots = await API.get(`/stations/${encodeURIComponent(station.rawId)}/owner-slots`, { params: { from, to, onlyFree: true, limit: 500 } });
          ownerSlots = resOwnerSlots.data.filter((s) => String(s.stationId) !== String(station.rawId)).map((sl) => ({
            slotId: sl._id, start: sl.start, end: sl.end, chargerType: sl.chargerType, chargerIndex: sl.chargerIndex, stationId: sl.stationId, stationName: sl.stationName || "Owner station", isDemo: !!sl.isDemo,
          }));
        } catch (e) { }
        const combined = [...stationSlots, ...ownerSlots];
        const mapById = {};
        for (const s of combined) mapById[String(s.slotId)] = s;
        const merged = Object.values(mapById).sort((a, b) => new Date(a.start) - new Date(b.start));
        if (merged.length === 0) {
          const today = new Date();
          const times = [9, 10, 11, 13, 14, 16];
          const demo = times.map((hour) => {
            const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, 0, 0);
            return {
              slotId: `demo-${station.rawId}-${hour}`,
              start,
              end: new Date(start.getTime() + 60 * 60000),
              chargerType: station.connectors?.[0] || "AC",
              stationId: station.rawId,
              stationName: station.name,
              isDemo: true,
            };
          });
          setBookingSlotsList(demo);
        } else {
          setBookingSlotsList(merged);
        }
      } catch (err) {
        console.error("fetch slots error", err);
        setBookingSlotsList([]);
      } finally {
        setSlotsLoading(false);
      }
    } else {
      const today = new Date();
      setBookingSlotsList([
        { slotId: "ocm-0900", start: new Date(today.setHours(9, 0, 0, 0)), end: new Date(today.setHours(10, 0, 0, 0)) },
        { slotId: "ocm-1000", start: new Date(today.setHours(10, 0, 0, 0)), end: new Date(today.setHours(11, 0, 0, 0)) },
        { slotId: "ocm-1100", start: new Date(today.setHours(11, 0, 0, 0)), end: new Date(today.setHours(12, 0, 0, 0)) },
      ]);
    }
  };

  const confirmBooking = async () => {
    if (!bookingSlot) return toast.error("Choose a slot first");
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/auth"; return; }
    try {
      if (bookingSlot.isDemo) {
        const payload = {
          demo: true,
          stationId: selectedStation.rawId || selectedStation.stationId,
          start: new Date(bookingSlot.start).toISOString(),
          end: new Date(bookingSlot.end).toISOString(),
          chargerType: bookingSlot.chargerType || selectedStation.connectors?.[0] || "AC",
          meta: { demoSource: "UI_OVERRIDE", stationName: selectedStation.name }
        };
        await API.post("/bookings", payload);
        toast.success("Reservation confirmed.");
      } else {
        await API.post("/bookings", { slotId: bookingSlot.slotId });
        toast.success("Booking confirmed successfully.");
      }
    } catch (err) {
      console.error("booking error", err);
      toast.error(err.response?.data?.message || "Booking failed. Please try again.");
    } finally {
      setShowModal(false);
    }
  };

  const handleBookFromList = (station) => {
    if (mapRef.current && station?.coords) {
      mapRef.current.setView([station.coords.lat, station.coords.lng], 14);
    }
    setActiveMarkerId(station.id);
    openBooking(station);
  };

  useEffect(() => {
    if (!mapRef.current) return;
    if (routingControl) { routingControl.remove(); setRoutingControl(null); }
    if (userLocation && searchMarker) {
      const control = L.Routing.control({
        waypoints: [L.latLng(userLocation.lat, userLocation.lng), L.latLng(searchMarker.lat, searchMarker.lng)],
        routeWhileDragging: false, addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: true, showAlternatives: false,
        lineOptions: { styles: [{ color: "#22c55e", weight: 5 }] },
      }).addTo(mapRef.current);
      setRoutingControl(control);
    }
    return () => { if (routingControl) routingControl.remove(); };
  }, [userLocation, searchMarker]);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 lg:px-8">
      {/* Header Glass Panel */}
      <header className="glass-panel p-6 lg:p-8 mb-8 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-glow-primary">Find Charging Points</h1>
          <p className="text-white/60">Find chargers near you • Book a time slot</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <input
            className="glass-input flex-1 lg:min-w-[300px]"
            placeholder="Search location (e.g. Pune)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <div className="flex gap-2">
            <button className="glass-btn-primary flex-1 sm:flex-none" onClick={handleSearch}>Search</button>
            <button className="glass-btn flex-1 sm:flex-none" onClick={panToUser} title="My Location">📍</button>
            <button className="glass-btn flex-1 sm:flex-none text-red-400" onClick={() => setQuery("")}>✕</button>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full">
        <section className="lg:col-span-3 flex flex-col gap-8">
          {/* Map Section */}
          <div className="glass-panel overflow-hidden relative group">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                Interactive Station Map
              </h2>
              <span className="text-[10px] uppercase tracking-widest text-white/40">Real-time Data</span>
            </div>

            <div className="h-[500px] lg:h-[600px] w-full z-0">
              <MapContainer
                center={[18.5204, 73.8567]}
                zoom={13}
                style={{ width: "100%", height: "100%" }}
                whenCreated={(map) => (mapRef.current = map)}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" />

                {searchMarker && (
                  <Marker position={[searchMarker.lat, searchMarker.lng]} icon={defaultIcon}>
                    <Popup><div className="font-bold">{searchMarker.label}</div></Popup>
                  </Marker>
                )}

                {stations.map((s) => (
                  <MarkerController key={s.id} activeId={activeMarkerId} markerId={s.id}>
                    <Marker
                      position={[s.coords.lat, s.coords.lng]}
                      icon={s.source === "db" ? greenIcon : yellowIcon}
                    >
                      <Popup autoPan={false}>
                        <div className="min-w-[200px] p-2">
                          <div className="flex justify-between items-start mb-2">
                            <strong className="text-slate-900">{s.name}</strong>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.source === "db" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {s.source === "db" ? "Owner" : "OCM"}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mb-3 line-clamp-2">{s.address}</div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                            <span className="text-sm font-bold text-primary">{s.availableSlots} free</span>
                            <button
                              className="bg-primary text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors font-bold"
                              onClick={() => openBooking(s)}
                            >
                              Book Now
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </MarkerController>
                ))}

                {userLocation && (
                  <Marker position={[userLocation.lat, userLocation.lng]} icon={defaultIcon}>
                    <Popup><strong>You are here</strong></Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {stations.map((s) => (
              <div key={s.id} className="glass-card group hover:scale-[1.02]">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-primary/20 transition-colors`}>
                      {s.source === "db" ? "🔌" : "🌐"}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${s.source === "db" ? "bg-primary/20 text-primary-light" : "bg-secondary/20 text-secondary"}`}>
                      {s.source === "db" ? "PREMIUM" : "OCM"}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-1 truncate">{s.name}</h3>
                  <p className="text-xs text-white/50 mb-4 line-clamp-1">{s.address}</p>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {s.connectors?.map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 glass-panel border-white/5 rounded-full">{c}</span>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <div>
                      <div className="text-lg font-extrabold text-primary-light">{s.availableSlots} <span className="text-[10px] font-normal text-white/40 uppercase">Slots</span></div>
                      <div className="text-[10px] text-white/30">From ₹{s.pricePerKWh}/kWh</div>
                    </div>
                    <button
                      className="glass-btn-primary px-4 py-2 text-xs"
                      onClick={() => handleBookFromList(s)}
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-8">
          <div className="glass-panel p-6 h-full flex flex-col">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
              <span className="w-4 h-4 rounded-md bg-secondary flex items-center justify-center text-[10px]">★</span>
              Nearby Results
            </h3>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {stations.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => handleBookFromList(s)}
                >
                  <div className="flex justify-between font-bold text-sm mb-1">
                    <span className="truncate max-w-[120px]">{s.name}</span>
                    <span className="text-primary-light text-[10px]">{s.availableSlots} FREE</span>
                  </div>
                  <div className="text-[10px] text-white/30 truncate mb-2">{s.connectors?.join(", ")}</div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-white/60">₹{s.pricePerKWh}/kWh</span>
                    <span className="bg-white/5 px-2 py-0.5 rounded-md">BOOK →</span>
                  </div>
                </div>
              ))}
              {stations.length === 0 && <div className="text-center py-12 text-white/20 italic">No stations found...</div>}
            </div>
          </div>
        </aside>
      </main>

      {/* Modern Booking Modal */}
      {showModal && selectedStation && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="glass-panel w-full max-w-lg relative animate-float shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{selectedStation.name}</h3>
                <p className="text-xs text-white/40">Secure Booking Portal</p>
              </div>
              <button className="w-8 h-8 flex items-center justify-center glass-panel hover:bg-red-500/20 text-white/50 hover:text-white" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-3">Select Availability</label>
                <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-3 gap-3">
                    {slotsLoading ? (
                      <div className="col-span-3 text-center py-8 animate-pulse text-primary-light font-bold uppercase tracking-widest text-[10px]">Checking Availability...</div>
                    ) : bookingSlotsList.length === 0 ? (
                      <div className="col-span-3 text-center py-8 text-white/20 italic text-xs">No slots found for the selected time.</div>
                    ) : (
                      bookingSlotsList.map((sl) => {
                        const startTime = new Date(sl.start).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
                        const endTime = new Date(sl.end).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
                        const label = sl.slotLabel || `${startTime} - ${endTime}`;
                        const isSelected = bookingSlot?.slotId === sl.slotId;
                        return (
                          <button
                            key={sl.slotId}
                            onClick={() => setBookingSlot(sl)}
                            className={`p-3 rounded-xl border text-center transition-all duration-300 group/slot ${isSelected ? "bg-primary/20 border-primary shadow-lg shadow-primary/20 scale-[1.02]" : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"}`}
                          >
                            <div className={`font-black text-[11px] leading-tight ${isSelected ? "text-primary-light" : "text-white/80"}`}>
                              {startTime}<br />
                              <span className="opacity-30 text-[9px] font-normal mx-1">to</span><br />
                              {endTime}
                            </div>
                            <div className="text-[7px] text-white/20 mt-2 uppercase truncate font-bold tracking-tighter group-hover/slot:text-white/40">{sl.stationName}</div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 glass-panel border-white/5">
                  <div className="text-[10px] text-white/40 uppercase mb-1">Connector</div>
                  <div className="font-bold flex items-center gap-2">⚡ {selectedStation.connectors?.[0]}</div>
                </div>
                <div className="p-4 glass-panel border-white/5">
                  <div className="text-[10px] text-white/40 uppercase mb-1">Rate</div>
                  <div className="font-bold flex items-center gap-2">₹ {selectedStation.pricePerKWh}/kWh</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 glass-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button
                  className="flex-1 glass-btn-primary disabled:opacity-50 disabled:grayscale"
                  onClick={confirmBooking}
                  disabled={!bookingSlot}
                >
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
