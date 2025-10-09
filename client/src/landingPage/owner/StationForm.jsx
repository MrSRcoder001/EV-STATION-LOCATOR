// client/src/pages/owner/StationForm.jsx
import React, { useEffect, useState } from "react";
import API from "../../api";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../owner/owner.css";
import fixLeafletIcons from "../../utils/leafletIconFix";
fixLeafletIcons();

// small marker component to allow clicking to set coords
function ClickMarker({ position, onChange }) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={[position[0], position[1]]} /> : null;
}

export default function StationForm() {
  const { id } = useParams();
  const editMode = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    lat: 18.5204,
    lng: 73.8567,
    chargers: [],
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
            address: s.address || "",
            phone: s.phone || "",
            lat: s.location?.coordinates?.[1] || 18.5204,
            lng: s.location?.coordinates?.[0] || 73.8567,
            chargers: s.chargers || [],
          });
        } catch (err) {
          alert("Failed to load station");
          navigate("/owner/stations");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function setCoords([lat, lng]) {
    setForm((prev) => ({ ...prev, lat, lng }));
  }
  // example function inside StationForm component
  async function handleImageUpload(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    const res = await API.post(`/owner/stations/${id}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // update local station state or images list
    setForm((prev) => ({
      ...prev,
      images: [...(prev.images || []), res.data.imageUrl],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (
      !form.name ||
      !Number.isFinite(Number(form.lat)) ||
      !Number.isFinite(Number(form.lng))
    ) {
      return alert("Name and valid coordinates required");
    }
    try {
      setLoading(true);
      const payload = {
        name: form.name,
        address: form.address,
        phone: form.phone,
        lat: Number(form.lat),
        lng: Number(form.lng),
        chargers: form.chargers,
      };
      if (editMode) {
        await API.put(`/owner/stations/${id}`, payload);
        alert("Updated");
      } else {
        await API.post("/owner/stations", payload);
        alert("Created");
      }
      navigate("/owner/stations");
    } catch (err) {
      alert("Save failed: " + (err?.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h2 style={{ textAlign: "center" }}>
        {editMode ? "Edit Station" : "Add Station"}
      </h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 12, maxWidth: 700, margin: "auto" }}
      >
        <label>Station name</label>
        <input name="name" value={form.name} onChange={onChange} required />

        <label>Address</label>
        <input name="address" value={form.address} onChange={onChange} />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={onChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Coordinates (lat, lng)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                name="lat"
                value={form.lat}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lat: e.target.value }))
                }
              />
              <input
                name="lng"
                value={form.lng}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lng: e.target.value }))
                }
              />
              <label>Upload Images</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files[0])}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            height: 360,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid #e6efe6",
          }}
        >
          <MapContainer
            center={[form.lat, form.lng]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ClickMarker
              position={[form.lat, form.lng]}
              onChange={([lat, lng]) => setCoords([lat, lng])}
            />
            {/* show marker at the coords */}
            <Marker position={[form.lat, form.lng]} />
          </MapContainer>
          <small style={{ display: "block", padding: 8, color: "#556c5a" }}>
            Tip: Click on map to set coordinates
          </small>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            margin: "auto",
            paddingBottom: "10px",
          }}
        >
          <button className="btn" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/owner/stations")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
