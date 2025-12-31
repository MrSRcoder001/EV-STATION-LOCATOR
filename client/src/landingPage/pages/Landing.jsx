// client/src/pages/LandingPage.jsx
import React, { useState } from "react";
import "./Landing.css";

export default function LandingPage() {
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLocate() {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("Geolocation not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        setMessage(`Found you — ${lat}, ${lng}. Showing nearby stations...`);
        // TODO: navigate to map page or call API
        // e.g., navigate(`/map?lat=${lat}&lng=${lng}`)
      },
      (err) => {
        setLocating(false);
        setMessage(
          "Unable to detect location. Please enable location services."
        );
      },
      { timeout: 10000 }
    );
  }

  return (
    <div className="container">
    <div className="landing-root">
      <header className="hero">
        <div className="hero-left">
          <div className="top-badge">New • Beta</div>
          <h1 className="title">
            Find EV Charging Stations — fast, local, simple.
          </h1>
          <p className="subtitle">
            EV Station Finder helps you locate nearby chargers, compare charger
            types and reserve a slot — all from one elegant app.
          </p>

          <div className="cta-row">
            <button className="btn primary" onClick={handleLocate}>
              {locating ? "Locating..." : "Find Stations Near Me"}
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                // smooth-scroll to features
                document
                  .querySelector(".features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore features
            </button>
          </div>

          <div className="trust-row">
            <div className="stat">
              <div className="stat-value">1.2k+</div>
              <div className="stat-label">Stations</div>
            </div>
            <div className="stat">
              <div className="stat-value">98%</div>
              <div className="stat-label">Happy users</div>
            </div>
            <div className="stat">
              <div className="stat-value">24/7</div>
              <div className="stat-label">Support</div>
            </div>
          </div>

          {message && <div className="message">{message}</div>}
        </div>

        <div className="hero-right">
          <div className="phone-mock">
            <div className="phone-topbar">
              <div className="logo">
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <defs />
                  <path
                    d="M3 13v4a2 2 0 0 0 2 2h2"
                    stroke="#255B2F"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M21 13v4a2 2 0 0 1-2 2h-2"
                    stroke="#255B2F"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M6 10c1.4-2 3.8-3 6-3s4.6 1 6 3"
                    stroke="#255B2F"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M12 5v2"
                    stroke="#F0C330"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <strong>EV Finder</strong>
              </div>
            </div>

            <div className="map-preview">
              {/* stylized map with animated markers */}
              <svg
                className="map-svg"
                viewBox="0 0 400 300"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden
              >
                <rect
                  x="0"
                  y="0"
                  width="400"
                  height="300"
                  rx="12"
                  fill="#eef7ec"
                />
                {/* roads */}
                <path
                  d="M10 200 Q80 150 140 170 T310 150"
                  stroke="#dfeee2"
                  strokeWidth="16"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M40 40 Q140 60 220 40 T380 60"
                  stroke="#e9f6e9"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* stations: markers */}
                <g className="marker-group">
                  <g transform="translate(120,120)" className="marker pulse">
                    <circle cx="0" cy="0" r="12" fill="#F6C94C" opacity="1" />
                    <path d="M-6 -2 L0 -10 L6 -2 L2 8 L-2 8 Z" fill="#2f9e44" />
                  </g>
                  <g
                    transform="translate(240,80)"
                    className="marker pulse delay1"
                  >
                    <circle cx="0" cy="0" r="12" fill="#F6C94C" />
                    <path d="M-6 -2 L0 -10 L6 -2 L2 8 L-2 8 Z" fill="#2f9e44" />
                  </g>
                  <g
                    transform="translate(290,200)"
                    className="marker pulse delay2"
                  >
                    <circle cx="0" cy="0" r="12" fill="#F6C94C" />
                    <path d="M-6 -2 L0 -10 L6 -2 L2 8 L-2 8 Z" fill="#2f9e44" />
                  </g>
                </g>
                {/* user dot */}
                <circle cx="50" cy="210" r="6" fill="#2f9e44" />
              </svg>
            </div>

            <div className="phone-footer">
              <div className="mini-cta">
                <button className="btn small" onClick={handleLocate}>
                  {locating ? "Locating..." : "Locate me"}
                </button>
                <span className="version">v0.9 • Beta</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="features" aria-label="Features">
        <h2>Powerful features designed for EV drivers</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-time availability</h3>
            <p>
              See which chargers are free right now and reserve a slot
              instantly.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>Accurate nearby search</h3>
            <p>
              Find stations near your current location with distance & travel
              time.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💳</div>
            <h3>Easy payments</h3>
            <p>
              Secure in-app payments and quick checkout (Stripe support coming).
            </p>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div>© {new Date().getFullYear()} EV Station Finder</div>
        <div className="footer-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#contact">Contact</a>
        </div>
      </footer>
    </div></div>
  );
}
