import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { name: "Home Dashboard", icon: "🟢", path: "/" },
        { name: "Find Stations", icon: "📍", path: "/home" },
        { name: "Route Planner", icon: "🗺️", path: "/home?tab=trip" },
        { name: "My Bookings", icon: "📅", path: "/profile" },
        { name: "Charging Activity", icon: "⚡", path: "/profile" },
        { name: "Wallet", icon: "💳", path: "/profile" },
        { name: "Help Center", icon: "❓", path: "#" },
    ];

    return (
        <aside className="w-64 h-full glass-panel flex flex-col justify-between overflow-y-auto hidden lg:flex custom-scrollbar py-6 shrink-0 z-10 sticky top-0">
            <div>
                <div className="px-6 mb-8 flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                        <h2 className="text-2xl font-black text-glow-primary uppercase tracking-tighter leading-none">EVCharge</h2>
                        <div className="text-[10px] text-white/50 lowercase tracking-widest leading-none mt-1">Power Your Journey</div>
                    </div>
                </div>

                <nav className="space-y-2 px-4">
                    {navItems.map((item) => {
                        const isActive = item.path.includes('?')
                            ? (location.pathname + location.search) === item.path
                            : location.pathname === item.path;
                        return (
                            <div
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 font-bold text-sm
                  ${isActive ? 'bg-primary/20 text-primary-light border border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {item.name}
                            </div>
                        );
                    })}
                </nav>
            </div>

            <div className="px-4 space-y-4">
                <div className="glass-panel border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-bl-full blur-2xl -z-10 transition-transform group-hover:scale-150"></div>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">My Vehicle</span>
                        <span className="text-[10px] font-bold text-primary-light bg-primary/20 px-2 py-0.5 rounded-full">Connected</span>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">🚗</div>
                        <div>
                            <div className="text-xs font-bold truncate max-w-[100px]">Tata Nexon EV</div>
                            <div className="text-[10px] text-white/40">MH 12 AB 1234</div>
                        </div>
                    </div>
                    <div className="space-y-1 mb-2">
                        <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-white/60">Battery</span>
                            <span className="text-primary-light">62%</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: '62%' }}></div>
                        </div>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                        <div>
                            <div className="text-[10px] text-white/50 flex flex-col">Range</div>
                            <div className="text-sm font-extrabold text-white">180 km</div>
                        </div>
                        <div className="text-[9px] text-white/40 text-right">
                            Est. 2h 15m to full charge
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-xs border border-secondary/50">PS</div>
                        <div>
                            <div className="text-xs font-bold">Priya Sharma</div>
                            <div className="text-[9px] text-secondary font-bold uppercase tracking-widest flex items-center gap-1">🌟 Premium</div>
                        </div>
                    </div>
                    <button onClick={() => { localStorage.clear(); navigate('/auth'); }} className="text-white/40 hover:text-red-400 p-1 text-sm font-bold" title="Logout">➜</button>
                </div>
            </div>
        </aside>
    );
}
