// client/src/pages/owner/StationList.jsx
import React, { useEffect, useState } from "react";
import API from "../../api";
import { Link } from "react-router-dom";

export default function StationList() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await API.get("/owner/stations");
      setStations(res.data);
    } catch (err) {
      alert("Failed to load stations");
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
      setStations(stations.filter((s) => s._id !== id));
    } catch (err) {
      alert("Delete failed");
    }
  }

  return (
    <div className="container">
      <div>
        <h2>Your Stations</h2>
        {loading ? (
          <p>Loading...</p>
        ) : stations.length === 0 ? (
          <p>
            No stations yet — <Link to="/owner/stations/new">Add one</Link>
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {stations.map((s) => (
              <div
                key={s._id}
                style={{
                  background: "#fff",
                  padding: 12,
                  borderRadius: 10,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: "#5b6b5b" }}>
                      {s.address}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7a6d" }}>
                      Coords: {s.location?.coordinates?.[1]},{" "}
                      {s.location?.coordinates?.[0]}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link to={`/owner/stations/${s._id}/edit`} className="btn">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="btn btn-ghost"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
