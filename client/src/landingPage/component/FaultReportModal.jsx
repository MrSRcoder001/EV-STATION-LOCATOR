import React, { useState } from 'react';
import API from '../../api';
import toast from 'react-hot-toast';

export default function FaultReportModal({ stationId, stationName, onClose }) {
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!description.trim()) {
            return toast.error("Please describe the issue");
        }

        setLoading(true);
        try {
            await API.post("/faults", {
                stationId,
                description
            });
            toast.success("Fault reported successfully. Thank you!");
            onClose();
        } catch (err) {
            console.error("Fault reporting error", err);
            toast.error("Failed to report fault.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="glass-panel w-full max-w-md relative animate-float shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black italic tracking-tighter text-red-500">REPORT FAULT</h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">{stationName}</p>
                    </div>
                    <button className="w-8 h-8 flex items-center justify-center glass-panel hover:bg-red-500/20 text-white/50 hover:text-white" onClick={onClose}>✕</button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-2 block">Issue Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="E.g. Charger #2 is offline..."
                                className="glass-input w-full min-h-[100px] text-sm py-3 px-4 resize-none"
                                required
                            ></textarea>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button type="button" className="flex-1 glass-btn text-xs py-3" onClick={onClose} disabled={loading}>Cancel</button>
                            <button type="submit" className="flex-1 glass-btn-primary bg-red-500 hover:bg-red-600 border-red-500/50 text-xs py-3 disabled:opacity-50" disabled={loading}>
                                {loading ? "Submitting..." : "Submit Report"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
