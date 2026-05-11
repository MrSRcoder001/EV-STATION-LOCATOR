import React from 'react';

export default function NearbyStationsList({ stations, onSelect }) {
    if (!stations || stations.length === 0) return null;

    return (
        <div className="mt-8">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-xl font-bold">Nearby Stations</h3>
                    <p className="text-xs text-white/50">Find and book the best charging stations near you</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">Sort by</span>
                    <select className="glass-input text-xs py-1.5 px-3">
                        <option>Distance</option>
                        <option>Price</option>
                        <option>Availability</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {stations.map((s, idx) => (
                    <div key={idx} className={`glass-panel p-4 flex gap-4 hover:bg-white/5 transition-all group overflow-hidden relative cursor-pointer ${s.isBest ? 'ring-2 ring-primary/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : ''}`} onClick={() => onSelect(s)}>
                        {s.isBest && (
                            <div className="absolute top-0 right-0 bg-primary text-slate-900 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-bl-lg shadow-lg z-10">
                                🤖 AI Recommended
                            </div>
                        )}
                        <div className="w-24 h-full min-h-[100px] rounded-xl overflow-hidden shrink-0 bg-white/5 relative">
                            <img src="https://images.unsplash.com/photo-1751553822264-47ef77e3495f?q=80&w=200&auto=format&fit=crop" alt={`${s.name} charging station`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-sm truncate pr-2 max-w-[120px]">{s.name}</h4>
                                    <span className="text-[10px] bg-primary/20 text-primary-light px-1.5 py-0.5 rounded flex items-center font-bold">★ 4.6</span>
                                </div>
                                <div className="text-[10px] text-white/50 flex items-center gap-1 mb-2">
                                    <span>📍 {s.waitTime || "2.4 km"} away</span>
                                    <span>•</span>
                                    <span className="truncate">{s.address}</span>
                                </div>
                                <div className="flex gap-1.5 mb-2">
                                    <span className="text-[9px] text-blue-400 bg-blue-400/10 px-1.5 rounded-sm">Fast Charger</span>
                                    {s.connectors?.[0] && <span className="text-[9px] text-white/50 bg-white/5 px-1.5 rounded-sm">{s.connectors[0]}</span>}
                                </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/10 pt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white">₹{s.pricePerKWh} <span className="text-[10px] font-normal text-white/50">/ kWh</span></span>
                                    <span className="text-[9px] text-primary-light bg-primary/10 px-1 rounded">10% off</span>
                                </div>
                                <button className="glass-btn-primary px-3 py-1.5 text-xs">Book</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
