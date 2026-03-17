// client/src/common/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="mt-20 border-t border-white/5 bg-slate-950/40 backdrop-blur-2xl py-16 px-6 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">

                {/* Branding Section */}
                <div className="col-span-1 md:col-span-1">
                    <Link to="/" className="flex items-center gap-3 group mb-6">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 group-hover:bg-primary/30 transition-all">
                            <span className="text-xl text-glow-primary">⚡</span>
                        </div>
                        <span className="text-xl font-black tracking-tighter text-white">EV LOCATOR</span>
                    </Link>
                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                        Building the universe's most efficient EV charging network.
                        Real-time synchronization for a sustainable future.
                    </p>
                </div>

                {/* Navigation Links */}
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">Quick Links</h4>
                    <ul className="space-y-4">
                        <li><Link to="/" className="text-xs font-bold text-white/60 hover:text-primary-light transition-colors">Go to Home</Link></li>
                        <li><Link to="/home" className="text-xs font-bold text-white/60 hover:text-primary-light transition-colors">Find Charging Points</Link></li>
                        <li><Link to="/auth" className="text-xs font-bold text-white/60 hover:text-primary-light transition-colors">Sign In</Link></li>
                    </ul>
                </div>

                {/* Contact Information */}
                <div className="col-span-1 md:col-span-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">Contact & Support</h4>
                    <div className="glass-panel p-6 border-dashed border-white/5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <span className="block text-[8px] font-black text-primary-light uppercase tracking-widest mb-1">Developer & Support</span>
                                <span className="text-sm font-black text-white italic">Satish Rathod</span>
                            </div>
                            <div>
                                <span className="block text-[8px] font-black text-primary-light uppercase tracking-widest mb-1">Email Us</span>
                                <a href="mailto:satishcse27@gmail.com" className="text-sm font-bold text-white/80 hover:text-white transition-colors underline decoration-primary/30 underline-offset-4">satishcse27@gmail.com</a>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Global Network Status: Operational</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Copyright Footer */}
            <div className="container mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/20">
                <span>© 2026 EV LOCATOR • All Systems Active</span>
                <div className="flex gap-6">
                    <span className="hover:text-white/40 cursor-pointer transition-colors">Privacy Policy</span>
                    <span className="hover:text-white/40 cursor-pointer transition-colors">Terms of Service</span>
                </div>
            </div>
        </footer>
    );
}
