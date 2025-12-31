import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";
import L from "leaflet";
import "./Home.css";

// marker icons
const greenIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const yellowIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const defaultIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// map DB station doc to unified UI shape
function mapDbStationToUnified(s) {
  const coords =
    s?.location?.coordinates && Array.isArray(s.location.coordinates)
      ? { lat: s.location.coordinates[1], lng: s.location.coordinates[0] }
      : { lat: 0, lng: 0 };

  const connectors =
    Array.isArray(s.chargers) && s.chargers.length > 0
      ? s.chargers.map((c) => c.type || "AC")
      : ["AC"];

  const availableSlots = s.availableSlots ?? s.estimatedSlots ?? 0;
  const pricePerKWh =
    s.pricePerKWh ||
    (s.chargers && s.chargers[0] && s.chargers[0].pricePerKwh) ||
    0;

  return {
    id: `db_${s._id}`,
    rawId: s._id,
    source: "db",
    name: s.name || s.stationName || "Owner Station",
    address: s.address || s.stationAddress || "",
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
    address:
      s?.AddressInfo?.AddressLine1 ||
      s?.AddressInfo?.Town ||
      s?.AddressInfo?.StateOrProvince ||
      "",
    coords: { lat: Number(lat) || 0, lng: Number(lon) || 0 },
    connectors,
    availableSlots: s?.NumberOfPoints ?? 1,
    pricePerKWh: 20,
    original: s,
  };
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

  // move socket logic INSIDE the component
  // useEffect(() => {
  //   const token = localStorage.getItem("token");
  //   if (!token) return;
  //   const s = connectSocket(token);
  //   if (!s) return;
  //   s.on("connect_error", (err) => console.error("Socket connect_error", err));
  //   s.on("booking:new", (payload) => {
  //     console.log("socket booking:new", payload);
  //     // TODO: show toast / refresh relevant data
  //   });
  //   s.on("booking:updated", (payload) => {
  //     console.log("socket booking:updated", payload);
  //     // TODO: show toast / refresh relevant data
  //   });
  //   return () => {
  //     s.off("connect_error");
  //     s.off("booking:new");
  //     s.off("booking:updated");
  //   };
  // }, []);

  // fetch OpenChargeMap stations
  const fetchOcmStations = async (lat, lon) => {
    try {
      const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${encodeURIComponent(
        lat
      )}&longitude=${encodeURIComponent(
        lon
      )}&distance=10&maxresults=10&key=c4697cbb-0525-4304-aaf0-4a82496eb8e6`;
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
      const res = await fetch(
        `http://localhost:5000/api/stations/nearby?lat=${encodeURIComponent(
          lat
        )}&lng=${encodeURIComponent(lon)}&maxDistance=10000`
      );
      if (!res.ok) {
        console.error(
          "DB stations fetch failed:",
          res.status,
          await res.text()
        );
        return [];
      }
      const data = await res.json();
      return data.map((s) => mapDbStationToUnified(s));
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
        const aCalc =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(a.lat)) *
            Math.cos(toRad(b.lat)) *
            Math.sin(dLon / 2) ** 2;
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

  // search by address/location (Nominatim)
  const handleSearch = async () => {
    if (!query || query.trim() === "")
      return alert("Enter a location to search");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}`
      );
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0)
        return alert("Location not found");
      const { lat, lon, display_name } = data[0];
      setSearchMarker({
        lat: parseFloat(lat),
        lng: parseFloat(lon),
        label: display_name,
      });
      if (mapRef.current)
        mapRef.current.flyTo([parseFloat(lat), parseFloat(lon)], 13, {
          animate: true,
          duration: 1.2,
        });
      await fetchStations(lat, lon);
    } catch (err) {
      console.error("Search error:", err);
      alert("Error fetching location");
    }
  };

  const panToUser = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(pos);
        if (mapRef.current)
          mapRef.current.flyTo([pos.lat, pos.lng], 13, {
            animate: true,
            duration: 1.2,
          });
        fetchStations(pos.lat, pos.lng);
      },
      (err) => {
        console.error("geolocation error", err);
        alert(
          "Unable to retrieve your location. Please allow location access."
        );
      }
    );
  };

  // open booking modal and fetch slots (station-specific + owner's other stations)
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

        // 1) slots for clicked station
        const resStationSlots = await fetch(
          `http://localhost:5000/api/stations/${encodeURIComponent(
            station.rawId
          )}/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
            to
          )}&onlyFree=true`
        );
        let stationSlots = [];
        if (resStationSlots.ok) {
          const slots = await resStationSlots.json();
          stationSlots = slots.map((sl) => ({
            slotId: sl._id,
            start: sl.start,
            end: sl.end,
            chargerType: sl.chargerType,
            chargerIndex: sl.chargerIndex,
            stationId: station.rawId,
            stationName: station.name,
            isDemo: !!sl.isDemo,
          }));
        } else {
          console.warn("station slots fetch failed", resStationSlots.status);
        }

        // 2) (optional) slots for other stations of same owner
        const resOwnerSlots = await fetch(
          `http://localhost:5000/api/stations/${encodeURIComponent(
            station.rawId
          )}/owner-slots?from=${encodeURIComponent(
            from
          )}&to=${encodeURIComponent(to)}&onlyFree=true&limit=500`
        );
        let ownerSlots = [];
        if (resOwnerSlots.ok) {
          const os = await resOwnerSlots.json();
          ownerSlots = os
            .filter((s) => String(s.stationId) !== String(station.rawId))
            .map((sl) => ({
              slotId: sl._id,
              start: sl.start,
              end: sl.end,
              chargerType: sl.chargerType,
              chargerIndex: sl.chargerIndex,
              stationId: sl.stationId,
              stationName: sl.stationName || "Owner station",
              isDemo: !!sl.isDemo,
            }));
        } else {
          // not critical, continue
          // console.warn('owner slots fetch failed', resOwnerSlots.status);
        }

        // combine, dedupe then sort
        const combined = [...stationSlots, ...ownerSlots];
        const mapById = {};
        for (const s of combined) mapById[String(s.slotId)] = s;
        const merged = Object.values(mapById).sort(
          (a, b) => new Date(a.start) - new Date(b.start)
        );

        // if empty -> demo fallback (09,10,11,13,14,16)
        if (merged.length === 0) {
          const today = new Date();
          const times = [9, 10, 11, 13, 14, 16];
          const demo = times.map((hour) => {
            const start = new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
              hour,
              0,
              0
            );
            return {
              slotId: `demo-${station.rawId}-${hour}`,
              slotLabel: `${String(hour).padStart(2, "0")}:00`,
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
      // OCM demo fallback
      setBookingSlotsList([
        { slotLabel: "09:00", slotId: "ocm-0900" },
        { slotLabel: "10:00", slotId: "ocm-1000" },
        { slotLabel: "11:00", slotId: "ocm-1100" },
      ]);
    }
  };

  // confirm booking -> POST /api/bookings
  // const confirmBooking = async () => {
  //   if (!bookingSlot) return alert("Choose a slot first");
  //   if (!selectedStation) return;

  //   if (bookingSlot.isDemo) {
  //     return alert(
  //       "This is a demo slot (not bookable). Owner needs to enable real slots."
  //     );
  //   }

  //   if (selectedStation.source === "db") {
  //     const token = localStorage.getItem("token");
  //     if (!token) {
  //       window.location.href = "/auth";
  //         },
  //         body: JSON.stringify({ slotId: bookingSlot.slotId }),
  //       });

  //       if (res.status === 409) {
  //         alert("Slot already booked. Please choose another.");
  //       } else if (!res.ok) {
  //         const txt = await res.text();
  //         alert("Booking failed: " + txt);
  //       } else {
  //         const data = await res.json();
  //         alert("Booking created and pending owner approval.");
  //         // optionally navigate to bookings page: window.location.href = '/bookings'
  //       }
  //     } catch (err) {
  //       console.error("booking error", err);
  //       alert("Booking failed");
  //     } finally {
  //       setShowModal(false);
  //     }
  //   } else {
  //     alert(`Booked ${selectedStation.name} — Slot ${bookingSlot.slotLabel}`);
  //     setShowModal(false);
  //   }
  // };

  // inside src/Home.jsx component - replace confirmBooking with below
  const confirmBooking = async () => {
    if (!bookingSlot) return alert("Choose a slot first");
    if (!selectedStation) return;

    const token = localStorage.getItem("token");
    if (!token) {
      // not logged in -> go to auth
      window.location.href = "/auth";
      return;
    }

    try {
      // If this is a demo slot created client-side (isDemo true and has start/end)
      if (bookingSlot.isDemo) {
        // prepare payload: demo booking -> server will create a real slot then booking
        const payload = {
          demo: true,
          stationId: selectedStation.rawId || selectedStation.stationId,
          start: (bookingSlot.start instanceof Date
            ? bookingSlot.start
            : new Date(bookingSlot.start)
          ).toISOString(),
          end: (bookingSlot.end instanceof Date
            ? bookingSlot.end
            : new Date(bookingSlot.end)
          ).toISOString(),
          chargerType:
            bookingSlot.chargerType || selectedStation.connectors?.[0] || "AC",
        };

        const res = await fetch("http://localhost:5000/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const txt = await res.text();
          alert("Booking failed: " + txt);
        } else {
          const data = await res.json();
          alert(
            "Booking created (demo turned real) and pending owner approval."
          );
        }
      } else {
        // normal existing slot booking
        const res = await fetch("http://localhost:5000/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ slotId: bookingSlot.slotId }),
        });

        if (res.status === 409) {
          alert("Slot already booked. Please choose another.");
        } else if (!res.ok) {
          const txt = await res.text();
          alert("Booking failed: " + txt);
        } else {
          const data = await res.json();
          alert("Booking created and pending owner approval.");
        }
      }
    } catch (err) {
      console.error("booking error", err);
      alert("Booking failed");
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

  // routing control for map (user -> searched place)
  useEffect(() => {
    if (!mapRef.current) return;

    if (routingControl) {
      routingControl.remove();
      setRoutingControl(null);
    }
    if (userLocation && searchMarker) {
      const control = L.Routing.control({
        waypoints: [
          L.latLng(userLocation.lat, userLocation.lng),
          L.latLng(searchMarker.lat, searchMarker.lng),
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        lineOptions: { styles: [{ color: "#007bff", weight: 5 }] },
      }).addTo(mapRef.current);
      setRoutingControl(control);
    }
    return () => {
      if (routingControl) routingControl.remove();
    };
  }, [userLocation, searchMarker]);

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 style={{ fontSize: "30px" }}>EV Station Finder</h1>
          <p>Find chargers near you • Book a time slot</p>
        </div>

        <div className="search-bar">
          <input
            className="input"
            placeholder="Search any location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            style={{ backgroundColor: "#ffc107" }}
            className="btn"
            onClick={handleSearch}
          >
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
            <span className="muted">
              (Owner stations from DB + OpenChargeMap)
            </span>
          </div>

          <div
            className="map-placeholder"
            style={{ height: 380, borderRadius: 12, overflow: "hidden" }}
          >
            <MapContainer
              center={[18.5204, 73.8567]}
              zoom={13}
              style={{ width: "100%", height: "100%", position: "sticky" }}
              whenCreated={(map) => (mapRef.current = map)}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {searchMarker && (
                <Marker
                  position={[searchMarker.lat, searchMarker.lng]}
                  icon={defaultIcon}
                >
                  <Popup>
                    <div>
                      <strong>Searched Location</strong>
                      <div style={{ fontSize: 12 }}>{searchMarker.label}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {stations.map((s) => (
                <Marker
                  key={s.id}
                  position={[s.coords.lat, s.coords.lng]}
                  icon={s.source === "db" ? greenIcon : yellowIcon}
                  eventHandlers={{
                    click: () => {
                      setActiveMarkerId(s.id);
                      if (mapRef.current)
                        mapRef.current.setView(
                          [s.coords.lat, s.coords.lng],
                          14
                        );
                    },
                  }}
                >
                  <Popup>
                    <div style={{ maxWidth: 260 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <strong>{s.name}</strong>
                        <span
                          style={{
                            fontSize: 12,
                            padding: "3px 8px",
                            borderRadius: 8,
                            background:
                              s.source === "db" ? "#e9f8ee" : "#fff2d9",
                          }}
                        >
                          {s.source === "db" ? "Owner" : "OCM"}
                        </span>
                      </div>
                      <div className="station-info" style={{ marginTop: 6 }}>
                        {s.address}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {s.availableSlots} free
                        </div>
                        <button
                          className="btn success"
                          onClick={() => openBooking(s)}
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {userLocation && (
                <Marker
                  position={[userLocation.lat, userLocation.lng]}
                  icon={defaultIcon}
                >
                  <Popup>
                    <div>
                      <strong>Your Location</strong>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          <div className="station-grid" style={{ marginTop: 12 }}>
            {stations.map((s) => (
              <div
                key={s.id}
                className="station-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 12,
                }}
              >
                <div>
                  <div className="station-name">{s.name}</div>
                  <div className="station-info">{s.address}</div>
                  <div className="station-info">
                    {s.connectors?.join(" • ")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="station-slots">{s.availableSlots} slots</div>
                  <div className="station-price">₹{s.pricePerKWh}/kWh</div>
                  <button
                    className="btn success"
                    onClick={() => handleBookFromList(s)}
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
              <div
                key={s.id}
                className="station-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                }}
              >
                <div>
                  <div className="station-name">{s.name}</div>
                  <div className="station-info">{s.connectors?.join(", ")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
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

      {/* Booking modal */}
      {showModal && selectedStation && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Book Slot — {selectedStation.name}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <p className="muted">
              Choose an available slot
              {selectedStation.source === "db" ? "" : " (demo times)"} and
              connector type
            </p>

            <div className="slot-grid">
              {slotsLoading ? (
                <div>Loading slots...</div>
              ) : bookingSlotsList.length === 0 ? (
                <div className="muted">No available slots</div>
              ) : selectedStation.source === "db" ? (
                bookingSlotsList.map((sl) => {
                  const label = sl.slotLabel
                    ? sl.slotLabel
                    : new Date(sl.start).toLocaleString();
                  return (
                    <button
                      key={sl.slotId}
                      onClick={() => {
                        setBookingSlot(sl);
                        if (
                          sl.stationId &&
                          sl.stationId !== selectedStation.rawId
                        ) {
                          const other = stations.find(
                            (x) =>
                              (x.rawId &&
                                String(x.rawId) === String(sl.stationId)) ||
                              x.id === `db_${sl.stationId}`
                          );
                          if (other && other.coords && mapRef.current)
                            mapRef.current.setView(
                              [other.coords.lat, other.coords.lng],
                              14
                            );
                        }
                      }}
                      className={`slot-btn ${
                        bookingSlot && bookingSlot.slotId === sl.slotId
                          ? "selected"
                          : ""
                      }`}
                      title={sl.stationName}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 4,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {sl.stationName}
                      </div>
                    </button>
                  );
                })
              ) : (
                bookingSlotsList.map((sl) => (
                  <button
                    key={sl.slotId || sl.slotLabel}
                    onClick={() => setBookingSlot(sl)}
                    className={`slot-btn ${
                      bookingSlot === sl ? "selected" : ""
                    }`}
                  >
                    {sl.slotLabel}
                  </button>
                ))
              )}
            </div>

            <div className="modal-footer">
              <div>
                <div className="station-info">
                  Connector: <b>{selectedStation.connectors?.[0]}</b>
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

      <footer className="footer">
        Demo UI • Free Leaflet + OpenChargeMap + Owner DB
      </footer>
    </div>
  );
}
