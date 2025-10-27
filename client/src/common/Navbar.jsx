import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "./Navbar.css";

const AppNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); // 👈 role store karne ke liye

  const isActive = (path) => location.pathname === path;

  // Check if user has token and role
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setIsLoggedIn(true);
        setUserRole(decoded.role || null); // backend se jo role aa raha ho
      } catch (error) {
        console.error("Invalid token", error);
        setIsLoggedIn(false);
        setUserRole(null);
      }
    } else {
      setIsLoggedIn(false);
      setUserRole(null);
    }
  }, [location]);

  // Scroll shadow effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUserRole(null);
    navigate("/auth");
  };

  return (
    <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <img src="/media/EV_logo.png" alt="EV Logo" className="brand-logo" />
          <span>EV Finder</span>
        </Link>

        {/* Hamburger Menu */}
        <div
          className={`menu-toggle ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Nav Links */}
        <ul className={`nav-links ${menuOpen ? "active" : ""}`}>
          <li>
            <Link to="/" className={isActive("/") ? "active" : ""}>
              Home
            </Link>
          </li>

          {!isLoggedIn ? (
            <>
              <li>
                <Link to="/auth" className={isActive("/auth") ? "active" : ""}>
                  Login
                </Link>
              </li>
              <li>
                <Link to="/auth" className={isActive("/auth") ? "active" : ""}>
                  Register
                </Link>
              </li>
            </>
          ) : (
            <>
              {/* 👇 Only owner role */}
              {userRole === "owner" && (
                <>
                  <li>
                    <Link
                      to="/owner/dashboard"
                      className={isActive("/owner/dashboard") ? "active" : ""}
                    >
                      Owner Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/owner/stations/new"
                      className={isActive("/owner/stations/new") ? "active" : ""}
                    >
                      Add Station
                    </Link>
                  </li>
                </>
              )}

              {/* 👇 Logout for all logged in users */}
              <li>
                <Link to="/home" className={isActive("/home") ? "active" : ""}>
                  Search Station
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className={location.pathname === "/profile" ? "active" : ""}
                >
                  Booking History
                </Link>
              </li>

              <li>
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default AppNavbar;
