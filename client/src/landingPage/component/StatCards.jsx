import React from 'react';

export default function StatCards() {
    const stats = [
        { label: "Battery", value: "62%", sub: "180 km range", icon: "🔋", color: "text-primary-light" },
        { label: "Nearby Stations", value: "8", sub: "Within 5 km", icon: "⚡", color: "text-blue-400" },
        { label: "Est. Savings", value: "₹320", sub: "This month", icon: "⏱️", color: "text-yellow-400" },
        { label: "CO₂ Saved", value: "24.5 kg", sub: "This month", icon: "🍃", color: "text-green-400" },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {stats.map((item, idx) => (
                <div key={idx} className="glass-panel p-4 flex flex-col justify-between group hover:bg-white/5 transition-all">
                    <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl mb-3 shadow-inner ${item.color}`}>
                        {item.icon}
                    </div>
                    <div>
                        <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">{item.label}</div>
                        <div className={`text-xl font-black mb-1 leading-none ${item.color}`}>{item.value}</div>
                        <div className="text-[10px] text-white/40 font-medium">{item.sub}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
