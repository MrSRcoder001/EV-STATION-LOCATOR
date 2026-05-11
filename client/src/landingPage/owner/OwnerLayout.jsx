import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function OwnerLayout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const links = [
    { name: 'Dashboard', path: '/owner/dashboard', icon: 'DB' },
    { name: 'Stations', path: '/owner/stations', icon: 'ST' },
    { name: 'Operations', path: '/owner/operations', icon: 'OP' },
    { name: 'Analytics', path: '/owner/analytics', icon: 'AN' },
  ];

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <div className="flex bg-[#0f172a] text-white min-h-screen overflow-hidden">
      <aside className="w-64 glass-panel border-r border-white/10 flex flex-col pt-6 pb-4 shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-slate-950 flex items-center justify-center font-black">EV</div>
          <div>
            <h2 className="text-xl font-black leading-none tracking-tight">EVCharge</h2>
            <span className="text-[10px] text-primary-light font-bold uppercase tracking-widest bg-primary/20 px-2 py-0.5 rounded-full mt-1 inline-block">Owner</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive
                  ? 'bg-primary/10 text-primary-light border-l-4 border-primary'
                  : 'text-white/40 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                }`
              }
            >
              <span className="text-[10px] font-black bg-white/10 rounded-md px-1.5 py-1">{link.icon}</span>
              <span className="text-sm">{link.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 mt-4 pt-4 border-t border-white/10">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl mb-4">
            <div className="text-sm font-bold truncate">{user?.name || 'Station Owner'}</div>
            <div className="text-[10px] text-white/50 truncate">{user?.email || 'owner account'}</div>
          </div>
          <button onClick={logout} className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-white/40 hover:text-red-400 w-full text-left rounded-lg hover:bg-red-500/10 transition-colors">
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 shrink-0 border-b border-white/10 glass-panel flex items-center justify-between px-6 lg:px-8 z-10">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Owner Console</h1>
            <p className="text-xs text-white/40">Manage stations, slots, bookings, charger health, and revenue.</p>
          </div>
          <NavLink to="/home" className="glass-btn px-4 py-2 text-xs font-bold">Open User App</NavLink>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
