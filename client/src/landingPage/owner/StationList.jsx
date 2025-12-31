import React, { useEffect, useState } from "react";
import API from "../../api";
import { Link } from "react-router-dom";
import "./StationList.css"; // Import the CSS

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
      alert("Station deleted successfully");
      setStations(stations.filter((s) => s._id !== id));
    } catch (err) {
      alert("Delete failed");
    }
  }

  return (
    <div className="station-container">
      <h2 className="station-title">Your Stations</h2>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : stations.length === 0 ? (
        <p className="empty-text">
          No stations yet —{" "}
          <Link className="add-link" to="/owner/stations/new">
            Add one
          </Link>
        </p>
      ) : (
        <div className="station-list">
          {stations.map((s) => (
            <div key={s._id} className="station-card">
              <div className="station-info">
                <h3 className="station-name">{s.name}</h3>
                <p className="station-address">{s.address}</p>
                <p className="station-coords">
                  Coords: {s.location?.coordinates?.[1]},{" "}
                  {s.location?.coordinates?.[0]}
                </p>
              </div>
              <div className="station-actions">
                <Link
                  to={`/owner/stations/${s._id}/edit`}
                  className="btn edit-btn"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(s._id)}
                  className="btn delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
