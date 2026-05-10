import React from 'react';

export default function StationDetailsPane({ station, onClose, onBook }) {
    if (!station) return null;

    return (
        <div className="w-80 lg:w-96 glass-panel h-full absolute lg:relative right-0 top-0 z-[100] flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transform transition-transform border-l border-white/10">
            <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 z-10 backdrop-blur-md" onClick={onClose}>✕</button>

            <div className="h-48 w-full relative bg-white/5 shrink-0 overflow-hidden rounded-t-2xl">
                <img src="https://images.unsplash.com/photo-1662993863777-2c1bccc2aeeb?q=80&w=600&auto=format&fit=crop" alt="station" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-sm shadow-md text-xs font-bold text-primary-light flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    Available
                </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                <div className="mb-6">
                    <div className="flex justify-between items-start mb-1">
                        <h2 className="text-xl font-bold leading-tight pr-4">{station.name}</h2>
                        <div className="text-[10px] bg-primary/20 text-primary-light px-2 py-1 rounded font-bold shrink-0">★ 4.6</div>
                    </div>
                    <div className="text-xs text-white/50 flex flex-col gap-1 mb-3">
                        <div className="flex items-center gap-2">
                            <span>📍 {station.distance || "2.4 km"} away</span>
                            <span>•</span>
                            <span className="truncate">{station.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-yellow-500/80 mt-1">
                            <span>⏳ <strong className="text-yellow-400">AI Est. Wait:</strong> {station.waitTime || 0} mins</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-[10px] text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md font-bold">Fast Charger</span>
                        {station.connectors?.map((c, i) => (
                            <span key={i} className="text-[10px] text-white/60 bg-white/5 px-2 py-1 rounded-md">{c}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center bg-white/5 rounded-xl p-2 mb-6 border border-white/5">
                        <div>
                            <div className="text-lg font-bold text-primary-light">{station.availableSlots}</div>
                            <div className="text-[9px] uppercase tracking-widest text-white/40">Available</div>
                        </div>
                        <div className="border-x border-white/5">
                            <div className="text-lg font-bold text-yellow-400">2</div>
                            <div className="text-[9px] uppercase tracking-widest text-white/40">In Use</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-white/60">0</div>
                            <div className="text-[9px] uppercase tracking-widest text-white/40">Reserved</div>
                        </div>
                    </div>

                    <div className="glass-panel border-white/5 p-4 rounded-xl mb-6 flex justify-between items-center bg-primary/5 border-primary/20">
                        <div>
                            <div className="text-lg font-bold">₹{station.pricePerKWh} <span className="text-xs text-white/50 font-normal">/ kWh</span></div>
                            <div className="text-[10px] text-white/40">Price</div>
                        </div>
                        <div className="text-[10px] flex items-center gap-1 text-primary-light font-bold">
                            <span>🏷️</span> 10% off for members
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-3">
                            <h3 className="text-sm font-bold">Amenities</h3>
                            <span className="text-[10px] text-primary-light cursor-pointer">View All</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10">
                                <span className="text-lg mb-1">🚻</span>
                                <span className="text-[8px] uppercase tracking-widest text-white/50">Restroom</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10">
                                <span className="text-lg mb-1">☕</span>
                                <span className="text-[8px] uppercase tracking-widest text-white/50">Cafe</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10">
                                <span className="text-lg mb-1">📶</span>
                                <span className="text-[8px] uppercase tracking-widest text-white/50">Wi-Fi</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10">
                                <span className="text-lg mb-1">🅿️</span>
                                <span className="text-[8px] uppercase tracking-widest text-white/50">Parking</span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-sm font-bold mb-3">Busy Hours</h3>
                        <div className="h-16 flex items-end gap-1 px-1">
                            {/* Mock bars */}
                            {[2, 3, 1, 2, 4, 8, 12, 18, 24, 20, 15, 10, 12, 16, 22, 30, 26, 14, 8, 4, 3, 2, 1, 1].map((val, i) => (
                                <div key={i} className={`flex-1 rounded-t-sm transition-all hover:bg-white ${val > 20 ? 'bg-red-400' : val > 10 ? 'bg-yellow-400' : 'bg-primary'}`} style={{ height: `${val * 3}%` }}></div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-1 px-1 text-[8px] text-white/30 font-bold uppercase">
                            <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-auto shrink-0 mb-4 px-1">
                    <button className="glass-btn-primary flex-1 py-3 text-xs font-bold" onClick={() => onBook(station)}>Book Now</button>
                    <button className="glass-btn flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2" onClick={() => alert("Directions feature coming soon")}>
                        📍 Get Directions
                    </button>
                </div>

                <div className="text-center pb-2">
                    <button onClick={() => onReportFault && onReportFault(station)} className="text-[10px] text-red-500/60 hover:text-red-500 underline uppercase font-bold tracking-widest transition-colors">
                        ⚠ Report Issue with Station
                    </button>
                </div>
            </div>
        </div >
    );
}
