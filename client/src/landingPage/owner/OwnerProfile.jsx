// client/src/landingPage/owner/OwnerProfile.jsx
import React, { useState, useEffect } from "react";
import API from "../../api";
import toast from "react-hot-toast";

export default function OwnerProfile() {
    const [user, setUser] = useState({
        name: "",
        email: "",
        phone: "",
        alternatePhone: "",
        profileImage: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        try {
            setLoading(true);
            const res = await API.get("/auth/me").catch(() => null);
            if (res && res.data && res.data.user) {
                setUser(prev => ({ ...prev, ...res.data.user }));
            } else {
                const u = localStorage.getItem("user");
                if (u) setUser(prev => ({ ...prev, ...JSON.parse(u) }));
            }
        } catch (err) {
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    }

    function onChange(e) {
        setUser({ ...user, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setSaving(true);
            const res = await API.put("/auth/update-profile", {
                name: user.name,
                phone: user.phone,
                alternatePhone: user.alternatePhone,
                profileImage: user.profileImage
            });
            toast.success("Profile Updated");
            setUser(prev => ({ ...prev, ...res.data.user }));
            localStorage.setItem("user", JSON.stringify(res.data.user));
        } catch (err) {
            toast.error("Update Failed");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-20 text-center animate-pulse text-white/20 text-xs font-bold tracking-widest uppercase">Loading Profile...</div>;

    return (
        <div className="glass-panel p-8">
            <div className="mb-10">
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Profile Settings</h2>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Account Status: SECURE</p>
            </div>

            <div className="max-w-4xl mx-auto flex flex-col xl:flex-row gap-12">
                {/* Visual Identity */}
                <aside className="xl:w-1/3 text-center space-y-6">
                    <div className="w-32 h-32 mx-auto rounded-3xl border-2 border-primary/30 bg-primary/10 flex items-center justify-center overflow-hidden shadow-2xl shadow-primary/10 group">
                        {user.profileImage ? (
                            <img src={user.profileImage} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                            <span className="text-4xl font-black text-glow-primary">{user.name?.charAt(0).toUpperCase() || "?"}</span>
                        )}
                    </div>

                    <div className="text-left space-y-2">
                        <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest ml-1">Profile Image URL</label>
                        <input
                            name="profileImage"
                            value={user.profileImage}
                            onChange={onChange}
                            placeholder="https://..."
                            className="glass-input w-full text-[10px] font-mono"
                        />
                    </div>
                </aside>

                {/* Data Fields */}
                <form onSubmit={handleSubmit} className="xl:w-2/3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5 ml-1">Full Name</label>
                            <input name="name" value={user.name} onChange={onChange} required className="glass-input w-full" />
                        </div>

                        <div className="md:col-span-2 opacity-50">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5 ml-1">Email Address</label>
                            <input value={user.email} disabled className="glass-input w-full cursor-not-allowed" />
                        </div>

                        <div className="md:col-span-1">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5 ml-1">Phone Number</label>
                            <input name="phone" value={user.phone} onChange={onChange} className="glass-input w-full" placeholder="+91..." />
                        </div>

                        <div className="md:col-span-1">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5 ml-1">Alternate Phone</label>
                            <input name="alternatePhone" value={user.alternatePhone} onChange={onChange} className="glass-input w-full" placeholder="Optional" />
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex justify-end">
                        <button className="glass-btn-primary px-10 py-4 font-black uppercase tracking-widest text-xs disabled:opacity-50" disabled={saving}>
                            {saving ? "Saving..." : "Save Profile"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
