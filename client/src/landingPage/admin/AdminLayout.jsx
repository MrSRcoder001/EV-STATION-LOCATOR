import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/auth");
    };

    const sidebarLinks = [
        { name: "Dashboard", path: "/admin/dashboard", icon: "📊" },
        { name: "Manage Stations", path: "/admin/stations", icon: "📍" },
        { name: "Chargers", path: "/admin/chargers", icon: "⚡" },
        { name: "Sessions", path: "/admin/sessions", icon: "📅" },
        { name: "Users", path: "/admin/users", icon: "👥" },
        { name: "Analytics", path: "/admin/analytics", icon: "📈" },
        { name: "Alerts", path: "/admin/alerts", icon: "🔔", badge: 3 },
        { name: "Settings", path: "/admin/settings", icon: "⚙️" },
    ];

    return (
        <div className="flex bg-[#0f172a] text-white font-sans min-h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 glass-panel border-r border-white/10 flex flex-col pt-6 pb-4 shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20">
                <div className="px-6 mb-8 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center font-black text-slate-900 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                        ⚡
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white leading-none tracking-tight">EVCharge</h2>
                        <span className="text-[10px] text-primary-light font-bold uppercase tracking-widest bg-primary/20 px-2 py-0.5 rounded-full mt-1 inline-block">Admin</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-1">
                    {sidebarLinks.map((link) => (
                        <NavLink
                            key={link.name}
                            to={link.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive
                                    ? 'bg-primary/10 text-primary-light border-l-4 border-primary shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]'
                                    : 'text-white/40 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                                }`
                            }
                        >
                            <span className="text-lg opacity-80">{link.icon}</span>
                            <span className="text-sm">{link.name}</span>
                            {link.badge && (
                                <span className="ml-auto bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                    {link.badge}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </div>

                {/* Bottom Profile Widget */}
                <div className="px-4 mt-4 pt-4 border-t border-white/10">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl mb-4 relative overflow-hidden group hover:bg-white/10 transition-colors cursor-pointer">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full blur-xl group-hover:bg-primary/20 transition-all"></div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center justify-center shrink-0">
                                <span className="text-green-500 text-xl font-black">✔️</span>
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-sm font-bold text-white truncate">Super Admin</div>
                                <div className="text-[10px] text-white/50 truncate">admin@evcharge.com</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <button className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-white/40 hover:text-white w-full text-left rounded-lg hover:bg-white/5 transition-colors">
                            <span className="text-sm">❓</span> Help Center
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-white/40 hover:text-red-400 w-full text-left rounded-lg hover:bg-red-500/10 transition-colors">
                            <span className="text-sm">🚪</span> Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header Inline */}
                <header className="h-20 shrink-0 border-b border-white/10 glass-panel flex items-center justify-between px-6 lg:px-8 z-10 relative">
                    <div>
                        <h1 className="text-2xl font-black text-white hidden md:block tracking-tight">Dashboard</h1>
                        <p className="text-xs text-white/40 hidden md:block">Monitor and manage your EV charging network in real-time</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative hidden lg:block w-72">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xs">🔍</span>
                            <input
                                type="text"
                                placeholder="Search stations, users, sessions..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors relative">
                                🔔
                                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0f172a] font-bold text-white text-[8px] flex items-center justify-center">3</span>
                            </button>

                            <div className="flex bg-white/5 border border-white/10 rounded-full p-1">
                                <button className="w-8 h-8 rounded-full flex items-center justify-center text-xs bg-transparent text-white/40">☀️</button>
                                <button className="w-8 h-8 rounded-full flex items-center justify-center text-xs bg-slate-800 text-white shadow-md">🌙</button>
                            </div>

                            <div className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer">
                                <img src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff" alt="Admin" className="w-10 h-10 rounded-full border border-white/20" />
                                <div className="hidden sm:block text-sm font-bold text-white">Admin <span className="text-[10px] text-white/40 ml-1">▼</span></div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Scrollable Area */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-transparent">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
