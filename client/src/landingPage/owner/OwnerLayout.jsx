// client/src/landingPage/owner/OwnerLayout.jsx
import React, { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";

export default function OwnerLayout() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch (e) {
        console.error("parse user err", e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen pt-24 px-6 container mx-auto">
      <div className="flex flex-col lg:flex-row gap-10">

        {/* Owner Sidebar */}
        <aside className="lg:w-72">
          <div className="glass-panel p-8 sticky top-24">
            <div className="text-center mb-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border-2 border-primary/30 bg-primary/10 flex items-center justify-center overflow-hidden">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black">{user?.name?.charAt(0).toUpperCase() || "O"}</span>
                )}
              </div>
              <h3 className="font-black text-lg">{user?.name || "Owner"}</h3>
              <p className="text-[10px] text-primary-light font-bold tracking-widest uppercase mt-1">Certified Provider</p>
            </div>

            <nav className="flex flex-col gap-2">
              <Link to="/owner/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive("/owner/dashboard") ? "bg-primary/20 text-primary-light border border-primary/20 shadow-lg shadow-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                <span className="text-lg">📊</span>
                <span className="text-sm font-bold">Dashboard</span>
              </Link>
              <Link to="/owner/stations/new" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive("/owner/stations/new") ? "bg-primary/20 text-primary-light border border-primary/20 shadow-lg shadow-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                <span className="text-lg">➕</span>
                <span className="text-sm font-bold">Add Station</span>
              </Link>
              <Link to="/owner/bookings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive("/owner/bookings") ? "bg-primary/20 text-primary-light border border-primary/20 shadow-lg shadow-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                <span className="text-lg">📅</span>
                <span className="text-sm font-bold">Manage Bookings</span>
              </Link>
              <Link to="/owner/profile" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive("/owner/profile") ? "bg-primary/20 text-primary-light border border-primary/20 shadow-lg shadow-primary/10" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                <span className="text-lg">👤</span>
                <span className="text-sm font-bold">Profile</span>
              </Link>
            </nav>

            <div className="mt-10 pt-10 border-t border-white/5">
              <Link to="/home" className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 group transition-all">
                <span className="text-lg opacity-40 group-hover:opacity-100">🔍</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Public Search</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-h-[70vh]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
