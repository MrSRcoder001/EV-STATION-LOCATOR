// src/Home.jsx
import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./Home.css";

// Leaflet marker icon fix
const defaultIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function Home() {
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const mapRef = useRef();

  // Fetch EV stations by latitude and longitude
  const fetchStations = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lon}&distance=10&maxresults=10&key=c4697cbb-0525-4304-aaf0-4a82496eb8e6`
      );
      const data = await response.json();
      const mapped = data.map((s, index) => ({
        id: s.ID || index,
        name: s.AddressInfo.Title,
        address: s.AddressInfo.AddressLine1,
        coords: { lat: s.AddressInfo.Latitude, lng: s.AddressInfo.Longitude },
        connectors: s.Connections.map((c) => c.ConnectionType.Title),
        availableSlots: s.NumberOfPoints || 1,
        pricePerKWh: 20,
        distanceKm: 0,
      }));
      setStations(mapped);
    } catch (err) {
      console.error(err);
      setStations([]); // fallback empty if API fails
    }
  };

  // Initial load: default location (Pune)
  useEffect(() => {
    fetchStations(18.5204, 73.8567);
  }, []);

  // Search location using Nominatim API
  const handleSearch = async () => {
    if (!query) return alert("Enter a location to search");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
      );
      const data = await res.json();
      if (data.length === 0) return alert("Location not found");
      const { lat, lon } = data[0];

      // Pan map to searched location
      if (mapRef.current) {
        mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 14);
      }

      // Fetch nearby EV stations for searched location
      fetchStations(lat, lon);
    } catch (err) {
      console.error(err);
      alert("Error fetching location");
    }
  };

  const openBooking = (station) => {
    setSelectedStation(station);
    setBookingSlot(null);
    setShowModal(true);
  };

  const confirmBooking = () => {
    if (!bookingSlot) return alert("Choose a slot first");
    alert(
      `Booked ${selectedStation.name} — Slot ${bookingSlot} for ${selectedStation.connectors[0]}!`
    );
    setShowModal(false);
  };

  const panToUser = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (mapRef.current) {
          mapRef.current.setView([pos.lat, pos.lng], 14);
        }
        fetchStations(pos.lat, pos.lng);
      },
      (err) => {
        console.error(err);
        alert(
          "Unable to retrieve your location. Please allow location access."
        );
      }
    );
  };

  const handleBookFromList = (station) => {
    if (mapRef.current && station.coords) {
      mapRef.current.setView([station.coords.lat, station.coords.lng], 14);
    }
    setActiveMarkerId(station.id);
    openBooking(station);
  };

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 className="" style={{fontSize:"30px"}} >EV Station Finder</h1>
          <p className="">Find chargers near you • Book a time slot</p>
        </div>
        <div className="search-bar">
          <input
            className="input"
            placeholder="Search any location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button style={{backgroundColor:" #ffc107"}} className="btn  "  onClick={handleSearch}>
            Search
          </button>
          <button className="btn secondary" onClick={() => setQuery("")}>
            Clear
          </button>
          <button className="btn secondary" onClick={panToUser}>
            My Location
          </button>
        </div>
      </header>

      <main className="main" style={{ gap: 20 }}>
        <section className="map-section" style={{ minHeight: 420 }}>
          <div className="map-header">
            <h2>Map</h2>
            <span className="muted">(Free Search — Near by EV station on OpenChargeMap)</span>
          </div>
          <div
            className="map-placeholder"
            style={{ height: 320, borderRadius: 12, overflow: "hidden" }}
          >
            <MapContainer
              center={[18.5204, 73.8567]}
              zoom={13}
              style={{ width: "100%", height: "100%",position:"sticky"}}
              whenCreated={(map) => (mapRef.current = map)}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {stations.map((s) => (
                <Marker
                  key={s.id}
                  position={[s.coords.lat, s.coords.lng]}
                  icon={defaultIcon}
                  eventHandlers={{
                    click: () => {
                      setActiveMarkerId(s.id);
                      mapRef.current.setView([s.coords.lat, s.coords.lng], 14);
                    },
                  }}
                >
                  {activeMarkerId === s.id && (
                    <Popup>
                      <div style={{ maxWidth: 220 }}>
                        <div style={{ fontWeight: 700 }}>{s.name}</div>
                        <div className="station-info">{s.address}</div>
                        <div style={{ marginTop: 6, fontSize: 13 }}>
                          {s.connectors.join(" • ")}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 8,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>
                            {s.availableSlots} free
                          </div>
                          <button
                            className="btn success"
                            onClick={() => openBooking(s)}
                            style={{ fontSize: 13 }}
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </Popup>
                  )}
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className="station-grid" style={{ marginTop: 12 }}>
            {stations.map((s) => (
              <div key={s.id} className="station-card" style={{display:"flex"}}>
                <div>
                  <div className="station-name">{s.name}</div>
                  <div className="station-info">{s.address}</div>
                  <div className="station-info">{s.connectors.join(" • ")}</div>
                </div>
                <div className="station-right">
                  <div className="station-slots">{s.availableSlots} slots</div>
                  <div className="station-price">₹{s.pricePerKWh}/kWh</div>
                  <button
                    className="btn success"
                    onClick={() => openBooking(s)}
                  >
                    Book Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="sidebar">
          <h3>Stations Nearby</h3>
          <div className="station-list">
            {stations.map((s) => (
              <div key={s.id} className="station-item">
                <div>
                  <div className="station-name">{s.name}</div>
                  <div className="station-info">{s.connectors.join(", ")}</div>
                </div>
                <div className="station-right">
                  <div className="station-slots">{s.availableSlots} free</div>
                  <button
                    className="btn primary"
                    onClick={() => handleBookFromList(s)}
                  >
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {showModal && selectedStation && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Book Slot — {selectedStation.name}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <p className="muted">Choose a time slot and connector type</p>

            <div className="slot-grid">
              {[ "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"].map(
                (slot) => (
                  <button
                    key={slot}
                    onClick={() => setBookingSlot(slot)}
                    className={`slot-btn ${
                      bookingSlot === slot ? "selected" : ""
                    }`}
                  >
                    {slot}
                  </button>
                )
              )}
            </div>

            <div className="modal-footer">
              <div>
                <div className="station-info">
                  Connector: <b>{selectedStation.connectors[0]}</b>
                </div>
                <div className="station-info">
                  Price: <b>₹{selectedStation.pricePerKWh}/kWh</b>
                </div>
              </div>
              <div>
                <button className="btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn primary" onClick={confirmBooking}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">Demo UI • Free Leaflet + OpenChargeMap</footer>
    </div>
  );
}
