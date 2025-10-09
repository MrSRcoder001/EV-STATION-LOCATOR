import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
// index.js ya App.js me
import "leaflet/dist/leaflet.css";
import "./owner.css";


const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function LocationMarker({ onSelect }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={markerIcon}></Marker>
  );
}

export default function MapPicker({ onSelect }) {
  return (
    <div style={{ height: "300px", width: "100%", marginBottom: "10px" }}>
      <MapContainer
        center={[19.076, 72.8777]} // Mumbai default
        zoom={12}
        style={{ height: "100%", width: "100%", borderRadius: "var(--radius)" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <LocationMarker onSelect={onSelect} />
      </MapContainer>
    </div>
  );
}
