// client/src/common/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const AppNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setIsLoggedIn(true);
        setUserRole(decoded.role);
      } catch {
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth");
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ${scrolled ? "py-3 bg-slate-900/60 backdrop-blur-xl border-b border-white/10 shadow-lg" : "py-6 bg-transparent"}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform duration-300">
            <span className="text-xl text-glow-primary">⚡</span>
          </div>
          <span className="text-xl font-black tracking-tighter text-white group-hover:text-primary-light transition-colors">EV LOCATOR</span>
        </Link>

        {/* Desktop Links */}
        <ul className="hidden lg:flex items-center gap-8">
          <li>
            <Link to="/" className={`text-sm font-bold transition-all hover:text-primary-light ${isActive("/") ? "text-primary-light text-glow-primary" : "text-white/60"}`}>
              Home
            </Link>
          </li>

          {!isLoggedIn ? (
            <>
              <li>
                <Link to="/auth" className="text-sm font-bold text-white/60 hover:text-white transition-colors">Login</Link>
              </li>
              <li>
                <Link to="/auth" className="glass-btn-primary px-5 py-2 text-xs">Get Started</Link>
              </li>
            </>
          ) : (
            <>
              {userRole === "owner" ? (
                <>
                  <li><Link to="/owner/dashboard" className={`text-sm font-bold hover:text-primary-light ${isActive("/owner/dashboard") ? "text-primary-light text-glow-primary" : "text-white/60"}`}>Dashboard</Link></li>
                  <li><Link to="/owner/bookings" className={`text-sm font-bold hover:text-primary-light ${isActive("/owner/bookings") ? "text-primary-light text-glow-primary" : "text-white/60"}`}>Manage Bookings</Link></li>
                  <li><Link to="/owner/stations/new" className={`text-sm font-bold hover:text-primary-light ${isActive("/owner/stations/new") ? "text-primary-light text-glow-primary" : "text-white/60"}`}>Register Station</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/home" className={`text-sm font-bold hover:text-primary-light ${isActive("/home") ? "text-primary-light text-glow-primary" : "text-white/60"}`}>Find Charging Points</Link></li>
                  <li><Link to="/profile" className={`text-sm font-bold hover:text-primary-light ${isActive("/profile") ? "text-primary-light text-glow-primary" : "text-white/60"}`}>Booking History</Link></li>
                </>
              )}
              <li className="flex items-center gap-4 pl-4 border-l border-white/10 ml-2">
                <div className="w-9 h-9 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-xs font-bold text-primary-light overflow-hidden">
                  {(() => {
                    try {
                      const u = JSON.parse(localStorage.getItem("user") || "{}");
                      return u.profileImage ?
                        <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                        : u.name?.charAt(0).toUpperCase() || "U";
                    } catch (e) { return "U"; }
                  })()}
                </div>
                <button onClick={handleLogout} className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-red-400 transition-colors">
                  Sign Out
                </button>
              </li>
            </>
          )}
        </ul>

        {/* Mobile Toggle Signpost */}
        <button
          className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 glass-panel border-none bg-white/5 active:scale-90 transition-all"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "rotate-45 translate-y-2 text-primary" : ""}`}></span>
          <span className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "opacity-0" : ""}`}></span>
          <span className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "-rotate-45 -translate-y-2 text-primary" : ""}`}></span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`lg:hidden fixed inset-0 z-[-1] bg-slate-950/95 backdrop-blur-2xl transition-all duration-500 flex flex-col items-center justify-center ${menuOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}>
        <ul className="flex flex-col items-center gap-8 text-center">
          <li><Link to="/" className={`text-2xl font-black ${isActive("/") ? "text-primary" : "text-white"}`}>Home</Link></li>
          {!isLoggedIn ? (
            <li><Link to="/auth" className="text-2xl font-black text-primary animate-pulse">Login / Signup</Link></li>
          ) : (
            <>
              {userRole === "owner" ? (
                <>
                  <li><Link to="/owner/dashboard" className={`text-2xl font-black ${isActive("/owner/dashboard") ? "text-primary" : "text-white"}`}>Dashboard</Link></li>
                  <li><Link to="/owner/bookings" className={`text-2xl font-black ${isActive("/owner/bookings") ? "text-primary" : "text-white"}`}>Manage Bookings</Link></li>
                  <li><Link to="/owner/stations/new" className={`text-2xl font-black ${isActive("/owner/stations/new") ? "text-primary" : "text-white"}`}>Register Station</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/home" className={`text-2xl font-black ${isActive("/home") ? "text-primary" : "text-white"}`}>Find Charging Points</Link></li>
                  <li><Link to="/profile" className={`text-2xl font-black ${isActive("/profile") ? "text-primary" : "text-white"}`}>Booking History</Link></li>
                </>
              )}
              <li className="pt-6 border-t border-white/10 w-24">
                <button onClick={handleLogout} className="text-xl font-black text-red-500/80 hover:text-red-500 uppercase tracking-tighter">Sign Out</button>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};
export default AppNavbar;
