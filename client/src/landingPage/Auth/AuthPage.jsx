// client/src/pages/AuthPage.jsx
import React, { useState, useRef } from "react";
import API from "../../api";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function AuthPage() {
  const [tab, setTab] = useState("login"); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  // role for signup: 'user' or 'owner'
  const [role, setRole] = useState("user");

  // optional station info (only when role === 'owner')
  const [station, setStation] = useState({
    name: "",
    address: "",
    lat: "",
    lng: ""
  });

  // modal state
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [modalType, setModalType] = useState("missing"); // "missing" or "explain"
  const stationSectionRef = useRef(null);

  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function onStationChange(e) {
    setStation((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function scrollToStationSection() {
    if (stationSectionRef.current) {
      stationSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // client-side check for required owner fields
  function ownerFieldsComplete() {
    if (role !== "owner") return true;
    // require non-empty name and address and numeric lat/lng
    const okName = station.name && station.name.trim().length > 0;
    const okAddr = station.address && station.address.trim().length > 0;
    const lat = Number(station.lat);
    const lng = Number(station.lng);
    const okCoords = Number.isFinite(lat) && Number.isFinite(lng);
    return okName && okAddr && okCoords;
  }

  async function signup(e) {
    e.preventDefault();

    // If role is owner and station info incomplete -> show modal
    if (role === "owner" && !ownerFieldsComplete()) {
      setModalType("missing");
      setShowOwnerModal(true);
      return;
    }

    // proceed to call API
    try {
      setLoading(true);

      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role
      };

      if (role === "owner") {
        // include station only if provided
        if (station.name) payload.stationName = station.name;
        if (station.address) payload.stationAddress = station.address;
        if (station.lat && station.lng) {
          payload.stationLat = Number(station.lat);
          payload.stationLng = Number(station.lng);
        }
      }

      const res = await API.post("/auth/register", payload);
      localStorage.setItem("token", res.data.token);

      if (role === "owner") navigate("/owner/dashboard");
      else navigate("/home");
    } catch (err) {
      const msg = err?.response?.data?.message || (err?.response?.data?.errors ? err.response.data.errors[0].msg : "Signup failed");
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await API.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("token", res.data.token);

      const roleFromServer = res?.data?.user?.role;
      if (roleFromServer === "owner") navigate("/owner/dashboard");
      else navigate("/home");
    } catch (err) {
      alert(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  // modal actions
  function handleFillNow() {
    setShowOwnerModal(false);
    // ensure the station section is visible
    setTimeout(() => scrollToStationSection(), 200);
  }

  function handleCancelModal() {
    setShowOwnerModal(false);
  }

  function handleRegisterAsUser() {
    // convert to user role and continue signup flow (so backend accepts)
    setRole("user");
    setShowOwnerModal(false);
    // optionally auto-submit after converting role
  }

  return (
    <div className="auth-root">
      <div className="card auth-card">
        <div className="brand">
          <div className="logo-circle">⚡</div>
          <div>
            <h1>EV Station Finder</h1>
            <p className="tag">Find & Book nearby charging slots</p>
          </div>
        </div>

        <div className="tabs">
          <button
            className={tab === "login" ? "active" : ""}
            onClick={() => setTab("login")}
          >
            Login
          </button>
          <button
            className={tab === "signup" ? "active" : ""}
            onClick={() => setTab("signup")}
          >
            Signup
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={login} className="form">
            <label>Email</label>
            <input name="email" type="email" onChange={onChange} required />
            <label>Password</label>
            <input
              name="password"
              type="password"
              onChange={onChange}
              required
            />
            <button className="btn" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={signup} className="form">
            <label>Name</label>
            <input name="name" onChange={onChange} required />
            <label>Email</label>
            <input name="email" type="email" onChange={onChange} required />
            <label>Password</label>
            <input
              name="password"
              type="password"
              onChange={onChange}
              required
            />
            <label>Phone</label>
            <input name="phone" onChange={onChange} />

            {/* Role selection */}
            <div style={{ marginTop: 10 }}>
              <label style={{ fontWeight: 700 }}>Account type</label>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="radio" name="role" value="user" checked={role === "user"} onChange={() => setRole("user")} />
                  User
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="radio" name="role" value="owner" checked={role === "owner"} onChange={() => setRole("owner")} />
                  Station Owner
                </label>
              </div>
            </div>

            {/* Owner extra fields */}
            <div ref={stationSectionRef} style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid #eef6ea", background: "#fbfefb", display: role === "owner" ? "block" : "none" }}>
              <label style={{ fontWeight: 700 }}>Station details (required for owners)</label>
              <label style={{ marginTop: 8 }}>Station name</label>
              <input name="name" value={station.name} onChange={onStationChange} placeholder="Station name" />
              <label>Address</label>
              <input name="address" value={station.address} onChange={onStationChange} placeholder="Station address" />
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label>Latitude</label>
                  <input name="lat" value={station.lat} onChange={onStationChange} placeholder="ex: 18.5204" />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Longitude</label>
                  <input name="lng" value={station.lng} onChange={onStationChange} placeholder="ex: 73.8567" />
                </div>
              </div>
              <small style={{ color: "#6b7a6d" }}>Owners must provide station name, address and coordinates to register as an Owner.</small>
            </div>

            <button className="btn" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>
        )}

        <div className="footer-note">
          By creating an account, you agree to our Terms.
        </div>
      </div>

      {/* Owner modal */}
      {showOwnerModal && (
        <div className="modal-overlay" onClick={handleCancelModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Station information required</h3>
            <p>
              You selected <strong>Station Owner</strong> account. To register as an owner we need your station's
              name, address and coordinates (latitude & longitude). This helps drivers find your station.
            </p>

            <ul>
              <li><strong>Station name:</strong> Displayed to users on map and listings.</li>
              <li><strong>Address:</strong> Required for navigation and contact details.</li>
              <li><strong>Latitude/Longitude:</strong> Precise position for geolocation and nearby search.</li>
            </ul>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={handleFillNow}>Fill Now</button>
              <button className="btn btn-secondary" onClick={handleRegisterAsUser}>Register as User Instead</button>
              <button className="btn btn-ghost" onClick={handleCancelModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
