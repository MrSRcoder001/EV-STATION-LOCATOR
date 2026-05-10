// client/src/landingPage/pages/Home.jsx
import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, MarkerF, InfoWindowF, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";
import { useLocation } from "react-router-dom";
import API from "../../api";
import toast from 'react-hot-toast';
import Sidebar from '../component/Sidebar';
import Header from '../component/Header';
import StatCards from '../component/StatCards';
import NearbyStationsList from '../component/NearbyStationsList';
import StationDetailsPane from '../component/StationDetailsPane';
import FaultReportModal from '../component/FaultReportModal';
// marker icons

const greenIcon = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png";
const yellowIcon = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png";
const defaultIcon = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
const liveIconUrl = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";


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
  const waitTime = s.waitTime || 0;
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
    waitTime,
    status: s.status || 'Active',
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


export default function Home() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: "AIzaSyDZG_Bf3bqCrV6VnNykIVX3QeRjrTCpGbA"
  });

  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFaultModal, setShowFaultModal] = useState(false);
  const [faultStation, setFaultStation] = useState(null);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [bookingSlotsList, setBookingSlotsList] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [searchMarker, setSearchMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [routingControl, setRoutingControl] = useState(null);

  // Trip Planner & Battery
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("search");
  const [tripSource, setTripSource] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'trip') setActiveTab('trip');
    else setActiveTab('search');
  }, [location.search]);
  const [tripDest, setTripDest] = useState("");
  const [batteryLevel, setBatteryLevel] = useState(100);

  // Realtime Navigation Overlays
  const [routeStats, setRouteStats] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [livePosition, setLivePosition] = useState(null);
  const navWatchId = useRef(null);

  const mapRef = useRef();

  // Map Filter Status State
  const [filterMode, setFilterMode] = useState("all");

  // Derive final filtered and ranked stations (AI Smart Recommendation)
  const derivedStations = React.useMemo(() => {
    let filtered = [...stations];

    // 1. Apply Filters
    if (filterMode === 'fast') {
      filtered = filtered.filter(s => s.connectors.some(c => String(c).toLowerCase().includes('dc') || String(c).toLowerCase().includes('ccs') || String(c).toLowerCase().includes('fast')));
    } else if (filterMode === 'available') {
      filtered = filtered.filter(s => s.availableSlots > 0 && s.status === 'Active');
    }

    // 2. AI Rating - Smart Ranking System
    // Formula computation prioritizing Lowest Wait Time, Available Slots, and Cheaper price
    let ranked = filtered.map(s => {
      let score = 0;
      score += (s.waitTime || 0) * 1.5;
      score += (s.pricePerKWh || 20) * 0.8;
      if (s.availableSlots <= 0) score += 9999; // Deprioritize full stations
      return { ...s, aiScore: score };
    });

    ranked.sort((a, b) => a.aiScore - b.aiScore);

    // Tag the absolute best station based on the composite rating
    if (ranked.length > 0 && ranked[0].availableSlots > 0 && filterMode === "all") {
      ranked[0] = { ...ranked[0], isBest: true };
    }

    return ranked;
  }, [stations, filterMode]);


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
      if (mapRef.current) { mapRef.current.panTo({ lat: localMatch.coords.lat, lng: localMatch.coords.lng }); mapRef.current.setZoom(15); };
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
          if (mapRef.current) { mapRef.current.panTo({ lat: newLat, lng: newLon }); mapRef.current.setZoom(13); };
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

  const planTrip = async () => {
    if (!tripSource || !tripDest) return toast.error("Enter start and destination");
    try {
      const srcRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(tripSource)}`);
      const destRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(tripDest)}`);
      const srcData = await srcRes.json();
      const destData = await destRes.json();

      if (srcData.length > 0 && destData.length > 0) {
        const sLat = parseFloat(srcData[0].lat);
        const sLng = parseFloat(srcData[0].lon);
        const dLat = parseFloat(destData[0].lat);
        const dLng = parseFloat(destData[0].lon);

        // Turn off any previous live tracking
        if (isNavigating) {
          if (navWatchId.current) navigator.geolocation.clearWatch(navWatchId.current);
          setIsNavigating(false);
        }

        setUserLocation({ lat: sLat, lng: sLng });
        setSearchMarker({ lat: dLat, lng: dLng, label: "Destination" });

        if (mapRef.current) {
          if (window.google) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend({ lat: sLat, lng: sLng });
            bounds.extend({ lat: dLat, lng: dLng });
            mapRef.current.fitBounds(bounds);
          };
        }
        await fetchStations((sLat + dLat) / 2, (sLng + dLng) / 2);
        toast.success("Trip route mapped. Showing stations along the way.");
      } else {
        toast.error("Could not find start or destination coordinates.");
      }
    } catch (err) {
      toast.error("Error planning trip");
    }
  };

  const panToUser = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(pos);
        if (mapRef.current)
          if (mapRef.current) { mapRef.current.panTo({ lat: pos.lat, lng: pos.lng }); mapRef.current.setZoom(13); };
        fetchStations(pos.lat, pos.lng);
      },
      (err) => {
        console.error("geolocation error", err);
        toast.error("Unable to retrieve your location.");
      }
    );
  };

  const startNavigation = () => {
    if (isNavigating) {
      // stop navigation
      if (navWatchId.current) navigator.geolocation.clearWatch(navWatchId.current);
      setIsNavigating(false);
      setLivePosition(null);
      return;
    }
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setIsNavigating(true);
    toast.success("Live navigation started. Map will follow you.");

    // Start tracking specific to navigation overlay, without interrupting Leaflet routes
    navWatchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLivePosition(coords);
        if (mapRef.current) if (mapRef.current) { mapRef.current.panTo({ lat: coords.lat, lng: coords.lng }); mapRef.current.setZoom(16); };
      },
      (err) => {
        console.error("live tracking failed", err);
        toast.error("Live tracking signal lost");
        setIsNavigating(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
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
        { slotId: "ocm-0900", isDemo: true, start: new Date(today.setHours(9, 0, 0, 0)), end: new Date(today.setHours(10, 0, 0, 0)) },
        { slotId: "ocm-1000", isDemo: true, start: new Date(today.setHours(10, 0, 0, 0)), end: new Date(today.setHours(11, 0, 0, 0)) },
        { slotId: "ocm-1100", isDemo: true, start: new Date(today.setHours(11, 0, 0, 0)), end: new Date(today.setHours(12, 0, 0, 0)) },
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
      if (mapRef.current) { mapRef.current.panTo({ lat: station.coords.lat, lng: station.coords.lng }); mapRef.current.setZoom(14); };
    }
    setActiveMarkerId(station.id);
    openBooking(station);
  };

  useEffect(() => {
    if (!mapRef.current) return;
    if (directionsResponse) setDirectionsResponse(null);
    if (userLocation && searchMarker) {
      if (window.google) {
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route({
          origin: { lat: userLocation.lat, lng: userLocation.lng },
          destination: { lat: searchMarker.lat, lng: searchMarker.lng },
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirectionsResponse(result);
            const route = result.routes[0].legs[0];
            setRouteStats({
              distance: route.distance.text.replace(' km', ''),
              time: route.duration.text
            });
          }
        });
      }
    } else {
      setRouteStats(null);
    }

  }, [userLocation, searchMarker]);

  const [selectedStationForPane, setSelectedStationForPane] = useState(null);

  const modifiedHandleBookFromList = (station) => {
    if (mapRef.current && station?.coords) {
      if (mapRef.current) { mapRef.current.panTo({ lat: station.coords.lat, lng: station.coords.lng }); mapRef.current.setZoom(14); };
    }
    setActiveMarkerId(station.id);
    setSelectedStationForPane(station);
  };

  return (
    <div className="flex bg-[#0f172a] h-[calc(100vh-96px)] overflow-hidden text-white font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="p-4 lg:p-6 overflow-y-auto w-full h-full custom-scrollbar relative flex flex-col">
          <Header
            query={query} setQuery={setQuery} handleSearch={handleSearch}
            activeTab={activeTab} setActiveTab={setActiveTab}
            tripSource={tripSource} setTripSource={setTripSource}
            tripDest={tripDest} setTripDest={setTripDest}
            batteryLevel={batteryLevel} setBatteryLevel={setBatteryLevel}
            planTrip={planTrip}
          />

          <div className="flex-1 flex flex-col lg:flex-row min-h-[500px] mb-6 relative gap-4">
            <div className="flex-1 relative rounded-2xl overflow-hidden glass-panel shadow-lg min-h-[400px]">

              {/* Map filters absolute positioned on top */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 lg:left-4 lg:translate-x-0 z-10 flex flex-wrap justify-center gap-2">
                <button onClick={() => setFilterMode("all")} className={`${filterMode === "all" ? "bg-primary text-slate-900 border-primary shadow-[0_0_15px_rgba(34,197,94,0.4)]" : "bg-white/10 text-white border-white/20 hover:bg-white/20"} backdrop-blur-md border rounded-full px-4 py-2 font-bold text-xs flex items-center shadow-md transition-all`}>
                  🌍 All Near
                </button>
                <button onClick={() => setFilterMode("fast")} className={`${filterMode === "fast" ? "bg-primary text-slate-900 border-primary shadow-[0_0_15px_rgba(34,197,94,0.4)]" : "bg-white/10 text-white border-white/20 hover:bg-white/20"} backdrop-blur-md border rounded-full px-4 py-2 font-bold text-xs flex items-center shadow-md transition-all`}>
                  ⚡ Fast Charging
                </button>
                <button onClick={() => setFilterMode("available")} className={`${filterMode === "available" ? "bg-primary text-slate-900 border-primary shadow-[0_0_15px_rgba(34,197,94,0.4)]" : "bg-white/10 text-white border-white/20 hover:bg-white/20"} backdrop-blur-md border rounded-full px-4 py-2 font-bold text-xs flex items-center shadow-md transition-all`}>
                  🟢 Available Now
                </button>
              </div>

              {routeStats && activeTab === 'trip' && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[500] bg-slate-900/90 backdrop-blur-md p-4 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] border border-primary/20 w-64">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white text-xl font-bold flex items-center gap-2">🚗 {routeStats.time}</div>
                      <div className="text-white/70 text-sm font-semibold">{routeStats.distance} km</div>
                    </div>
                  </div>
                  <button
                    onClick={startNavigation}
                    className={`mt-4 w-full py-2.5 rounded-lg font-bold text-sm transition-all shadow-md active:scale-95 ${isNavigating ? 'bg-red-500/80 text-white hover:bg-red-500' : 'bg-primary text-slate-900 hover:bg-primary-light'}`}
                  >
                    {isNavigating ? "⏹ Stop Navigation" : "📍 Start Live Tracking"}
                  </button>
                </div>
              )}

              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ height: "100%", width: "100%" }}
                  center={{ lat: 18.5204, lng: 73.8567 }}
                  zoom={13}
                  onLoad={(map) => (mapRef.current = map)}
                  options={{
                    disableDefaultUI: true, // removes cluttered UI
                    zoomControl: true,
                  }}
                >
                  {directionsResponse && (
                    <DirectionsRenderer directions={directionsResponse} options={{ preserveViewport: true, polylineOptions: { strokeColor: '#3b82f6', strokeWeight: 6 } }} />
                  )}

                  {isNavigating && livePosition && (
                    <MarkerF position={livePosition} icon={{ url: liveIconUrl }} zIndex={1000} />
                  )}

                  {userLocation && !directionsResponse && (
                    <MarkerF position={userLocation} />
                  )}

                  {searchMarker && !directionsResponse && (
                    <MarkerF position={{ lat: searchMarker.lat, lng: searchMarker.lng }} icon={{ url: defaultIcon }}>
                      <InfoWindowF position={{ lat: searchMarker.lat, lng: searchMarker.lng }}>
                        <div className="font-bold text-slate-900">{searchMarker.label}</div>
                      </InfoWindowF>
                    </MarkerF>
                  )}

                  {derivedStations.map((s) => {
                    let pinUrl = yellowIcon;
                    if (s.isBest) pinUrl = greenIcon;
                    else if (s.source === "db") {
                      if (s.status === 'Maintenance' || s.status === 'Closed' || s.availableSlots === 0) pinUrl = defaultIcon; // Red Dot
                      else pinUrl = liveIconUrl; // Blue Dot
                    }
                    return (
                      <MarkerF
                        key={s.id}
                        position={{ lat: s.coords.lat, lng: s.coords.lng }}
                        icon={{ url: pinUrl }}
                        onClick={() => { modifiedHandleBookFromList(s) }}
                      />
                    );
                  })}
                </GoogleMap>
              ) : (
                <div style={{ height: "100%", width: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)' }}>Loading Map...</div>
              )}
            </div>

            {/* Right Pane conditionally renders if selectedStationForPane exists */}
            {selectedStationForPane && (
              <StationDetailsPane
                station={selectedStationForPane}
                onClose={() => setSelectedStationForPane(null)}
                onBook={openBooking}
                onReportFault={(st) => {
                  setFaultStation(st);
                  setShowFaultModal(true);
                }}
              />
            )}
          </div>

          <StatCards />
          <NearbyStationsList stations={derivedStations} onSelect={(s) => modifiedHandleBookFromList(s)} />

        </div>
      </div>

      {showFaultModal && faultStation && (
        <FaultReportModal
          stationId={faultStation.rawId || faultStation.id}
          stationName={faultStation.name}
          onClose={() => setShowFaultModal(false)}
        />
      )}

      {/* Modern Booking Modal overlaps everything */}
      {showModal && selectedStation && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
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
