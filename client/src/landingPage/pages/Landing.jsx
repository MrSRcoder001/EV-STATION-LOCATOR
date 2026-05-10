import React, { useState } from "react";
import toast from 'react-hot-toast';

export default function LandingPage() {
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLocate() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        toast.success(`Found your location! Lat: ${lat}, Lng: ${lng}`);
      },
      (err) => {
        setLocating(false);
        toast.error("Unable to detect location. Please enable location services.");
      },
      { timeout: 10000 }
    );
  }

  return (
    <div className="w-full">
      {/* Background blobs for depth */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse-slow"></div>
      </div>

      <header className="container mx-auto px-6 py-12 lg:py-24 flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-wider uppercase bg-primary/20 text-primary-light border border-primary/30 rounded-full">
            New • Premium Experience
          </div>
          <h1 className="text-5xl lg:text-[5rem] font-black leading-[1.1] mb-8 bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-200 to-primary-light tracking-tight drop-shadow-2xl">
            Find EV Charging Stations <br />
            <span className="text-primary text-glow-primary">Fast & Simple.</span>
          </h1>
          <p className="text-lg lg:text-xl text-white/70 mb-10 max-w-2xl">
            The ultimate EV station finder. Locate nearby chargers, compare speeds,
            and reserve your slot in seconds—all within our sleek, glass-morphic interface.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
            <button
              className="glass-btn-primary w-full sm:w-auto"
              onClick={handleLocate}
            >
              {locating ? "Locating..." : "Find Stations Near Me"}
            </button>
            <button
              className="glass-btn w-full sm:w-auto"
              onClick={() => {
                document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore Features
            </button>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10 max-w-lg mx-auto lg:mx-0">
            <div>
              <div className="text-2xl lg:text-3xl font-bold">1.2k+</div>
              <div className="text-xs lg:text-sm text-white/50 uppercase tracking-wider">Stations</div>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-bold">98%</div>
              <div className="text-xs lg:text-sm text-white/50 uppercase tracking-wider">Satisfaction</div>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-bold">24/7</div>
              <div className="text-xs lg:text-sm text-white/50 uppercase tracking-wider">Support</div>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full max-w-2xl animate-float">
          <div className="glass-panel p-1 aspect-[4/3] relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl -z-10 group-hover:scale-105 transition-transform duration-500"></div>

            <div className="w-full h-full bg-slate-900/50 rounded-xl overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-3 py-1 glass-card text-[10px] text-white/40 border-none">ev-locator.app</div>
                </div>
              </div>

              <div className="flex-1 relative">
                {/* Simplified Mock Map */}
                <svg viewBox="0 0 400 300" className="w-full h-full opacity-40">
                  <rect width="400" height="300" fill="#0f172a" />
                  <path d="M0 100 Q100 80 200 120 T400 100" stroke="#1e293b" strokeWidth="20" fill="none" />
                  <path d="M100 0 Q120 150 80 300" stroke="#1e293b" strokeWidth="20" fill="none" />
                  <circle cx="200" cy="150" r="100" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="10 5" className="animate-pulse" />
                </svg>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <div className="absolute -inset-4 bg-primary/30 blur-xl rounded-full"></div>
                    <div className="w-6 h-6 bg-primary rounded-full border-4 border-white shadow-lg relative z-10 animate-bounce"></div>
                  </div>
                </div>

                {/* Floating Info Cards */}
                <div className="absolute top-10 right-10 glass-panel p-3 border-primary/40 animate-float" style={{ animationDelay: '1s' }}>
                  <div className="text-primary text-[10px] font-bold">STATION READY</div>
                  <div className="text-xs">Pune Central Hub</div>
                </div>

                <div className="absolute bottom-10 left-10 glass-panel p-3 border-secondary/40 animate-float" style={{ animationDelay: '2s' }}>
                  <div className="text-secondary text-[10px] font-bold">2 SLOTS FREE</div>
                  <div className="text-xs">DCP Fast Charger</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="features" className="container mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">Smart Charging Features</h2>
          <p className="text-white/50">Everything you need for a seamless charging experience</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: "⚡", title: "Real-time Booking", desc: "Instantly check charger occupancy and secure your slot ahead of time." },
            { icon: "📍", title: "Smart Routing", desc: "Get optimized paths to the nearest available station from your current spot." },
            { icon: "💳", title: "Seamless Payments", desc: "Fast and secure transactions with our premium integrated wallet system." }
          ].map((feature, idx) => (
            <div key={idx} className="glass-card p-8 group">
              <div className="text-4xl mb-6 bg-white/5 w-16 h-16 flex items-center justify-center rounded-2xl group-hover:bg-primary/20 transition-colors duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-black tracking-tight mb-4 group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-white/50 leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
