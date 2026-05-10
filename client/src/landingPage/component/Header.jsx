import React from 'react';

export default function Header({
    query, setQuery, handleSearch,
    activeTab, setActiveTab,
    tripSource, setTripSource,
    tripDest, setTripDest,
    batteryLevel, setBatteryLevel, planTrip
}) {
    return (
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 z-20">

            {/* Search / Trip Input Area */}
            <div className="flex flex-col sm:flex-row w-full max-w-3xl flex-1 gap-3">
                {/* Toggle Pills */}
                <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden p-1 w-full sm:w-48 shrink-0 h-[46px]">
                    <button className={`flex-1 text-xs font-bold rounded-lg transition-all ${activeTab === 'search' ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'}`} onClick={() => setActiveTab('search')}>Search Nearby</button>
                    <button className={`flex-1 text-xs font-bold rounded-lg transition-all ${activeTab === 'trip' ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'}`} onClick={() => setActiveTab('trip')}>Trip Planner</button>
                </div>

                {/* Inputs */}
                <div className="flex-1 w-full h-[46px]">
                    {activeTab === 'search' ? (
                        <div className="relative w-full h-full flex">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                            <input
                                type="text"
                                placeholder="Search stations, locations, or routes..."
                                className="glass-input w-full pl-10 pr-12 h-full text-sm font-medium focus:ring-1 focus:ring-primary/50"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-primary transition-colors text-lg" onClick={handleSearch}>
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-2 h-full w-full">
                            <div className="flex gap-2 flex-1 h-full">
                                <input className="glass-input w-full px-3 h-full text-sm bg-white/5 placeholder-white/40 border-white/10" placeholder="From..." value={tripSource} onChange={e => setTripSource(e.target.value)} />
                                <input className="glass-input w-full px-3 h-full text-sm bg-white/5 placeholder-white/40 border-white/10" placeholder="To..." value={tripDest} onChange={e => setTripDest(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 flex-wrap md:flex-nowrap px-3 rounded-xl border border-white/10 h-full shrink-0">
                                <span className="text-[10px] text-white/50 font-bold uppercase hidden md:inline">Battery</span>
                                <input type="range" min="10" max="100" value={batteryLevel} onChange={e => setBatteryLevel(e.target.value)} className="w-16 md:w-20 accent-primary" />
                                <span className="text-xs font-bold text-primary-light w-8">{batteryLevel}%</span>
                                <span className="text-[9px] text-white/40 italic font-mono md:flex hidden whitespace-nowrap">Est. {(batteryLevel * 2.5).toFixed(0)} km</span>
                                <button className="glass-btn-primary px-3 py-1.5 text-xs h-8 ml-1" onClick={planTrip}>Plot</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto flex-wrap justify-end">
                <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 text-lg">
                    ☀️
                </button>
                <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 relative text-lg">
                    🔔
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0f172a] flex items-center justify-center text-[8px] font-bold text-white">3</span>
                </button>

                <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors h-[46px]">
                    <span className="text-white/60">👛 <span className="text-xs font-bold uppercase tracking-widest ml-1 hidden sm:inline">Wallet</span></span>
                    <span className="font-extrabold">₹2,450</span>
                </div>

                <img
                    src="https://randomuser.me/api/portraits/women/44.jpg"
                    alt="Profile"
                    className="w-[46px] h-[46px] rounded-full border-2 border-primary/50 object-cover cursor-pointer hover:border-primary transition-colors"
                />
            </div>
        </header>
    );
}
