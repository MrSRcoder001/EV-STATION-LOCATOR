import React, { useEffect, useState } from "react";
import API from "../../api";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import fixLeafletIcons from "../../utils/leafletIconFix";
import "./owner.css";

fixLeafletIcons();

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
    email: "",
    type: "Public",
    pricePerKwh: "",
    openTime: "06:00",
    closeTime: "22:00",
    lat: 18.5204,
    lng: 73.8567,
    chargers: [{ type: "Fast", count: 1 }],
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
            address: s.address || "",
            phone: s.phone || "",
            email: s.email || "",
            type: s.type || "Public",
            pricePerKwh: s.pricePerKwh || "",
            openTime: s.openTime || "06:00",
            closeTime: s.closeTime || "22:00",
            lat: s.location?.coordinates?.[1] || 18.5204,
            lng: s.location?.coordinates?.[0] || 73.8567,
            chargers: s.chargers || [{ type: "Fast", count: 1 }],
            amenities: s.amenities || [],
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

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
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

  const amenitiesList = ["Parking", "Restroom", "Food Court", "WiFi", "Shop"];

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

        <label>Email</label>
        <input
          name="email"
          value={form.email}
          onChange={onChange}
          type="email"
        />

        <label>Phone</label>
        <input name="phone" value={form.phone} onChange={onChange} />

        <label>Station Type</label>
        <select name="type" value={form.type} onChange={onChange}>
          <option value="Public">Public</option>
          <option value="Private">Private</option>
        </select>

        <label>Price per kWh (₹)</label>
        <input
          type="number"
          name="pricePerKwh"
          value={form.pricePerKwh}
          onChange={onChange}
        />

        <label>Operating Hours</label>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            type="time"
            name="openTime"
            value={form.openTime}
            onChange={onChange}
          />
          <input
            type="time"
            name="closeTime"
            value={form.closeTime}
            onChange={onChange}
          />
        </div>

        <label>Amenities</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {amenitiesList.map((am) => (
            <label key={am}>
              <input
                type="checkbox"
                checked={form.amenities.includes(am)}
                onChange={(e) => {
                  const newAmenities = e.target.checked
                    ? [...form.amenities, am]
                    : form.amenities.filter((a) => a !== am);
                  setForm((prev) => ({ ...prev, amenities: newAmenities }));
                }}
              />
              {am}
            </label>
          ))}
        </div>

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
              onChange={(coords) => setCoords(coords)}
            />
          </MapContainer>
        </div>

        <div style={{ display: "flex", gap: 12, margin: "auto" }}>
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
