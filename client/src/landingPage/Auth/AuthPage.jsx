// client/src/landingPage/Auth/AuthPage.jsx
import React, { useState, useRef } from "react";
import API from "../../api";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [tab, setTab] = useState("login"); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    alternatePhone: "",
    confirmPassword: "",
  });

  const [role, setRole] = useState("user");


  function onChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function signup(e) {
    e.preventDefault();
    if (tab === "signup" && form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Basic client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (form.phone && (form.phone.length < 10 || form.phone.length > 15)) {
      toast.error("Phone number must be between 10 and 15 digits");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        alternatePhone: form.alternatePhone,
        role
      };
      const res = await API.post("/auth/register", payload);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Connect socket on signup
      import("../../socket").then(m => m.connectSocket(res.data.token, res.data.user));

      if (role === "owner") navigate("/owner/dashboard");
      else navigate("/home");
      toast.success("Welcome aboard!");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await API.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Connect socket on login
      import("../../socket").then(m => m.connectSocket(res.data.token, res.data.user));

      const roleFromServer = res?.data?.user?.role;
      if (roleFromServer === "owner") navigate("/owner/dashboard");
      else navigate("/home");
      toast.success("Logged in successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-6 mt-10">
      <div className="glass-panel w-full max-w-lg p-8 animate-float shadow-2xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-primary/30 text-glow-primary">⚡</div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">EV Station Locator</h1>
          <p className="text-white/50 text-sm italic">Fast & Secure Sign In</p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl mb-8 border border-white/5">
          <button
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === "login" ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white/60"}`}
            onClick={() => setTab("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === "signup" ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white/60"}`}
            onClick={() => setTab("signup")}
          >
            Signup
          </button>
        </div>

        <form onSubmit={tab === "login" ? login : signup} className="space-y-6">
          {tab === "signup" && (
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5 ml-1">Full Name</label>
              <input name="name" onChange={onChange} required className="glass-input w-full" placeholder="John Doe" />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5 ml-1">Email Address</label>
            <input name="email" type="email" onChange={onChange} required className="glass-input w-full" placeholder="john@example.com" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5 ml-1">Password</label>
            <input name="password" type="password" onChange={onChange} required className="glass-input w-full" placeholder="••••••••" />
          </div>

          {tab === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5 ml-1">Phone</label>
                  <input name="phone" onChange={onChange} className="glass-input w-full" placeholder="9876543210" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5 ml-1">Alternate</label>
                  <input name="alternatePhone" onChange={onChange} className="glass-input w-full" placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5 ml-1">Confirm Password</label>
                <input name="confirmPassword" type="password" onChange={onChange} required className="glass-input w-full" placeholder="••••••••" />
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-3">Account Type</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="role" value="user" checked={role === "user"} onChange={() => setRole("user")} className="hidden peer" />
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 peer-checked:border-primary peer-checked:bg-primary transition-all"></div>
                    <span className="text-sm text-white/60 group-hover:text-white transition-colors">Customer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="role" value="owner" checked={role === "owner"} onChange={() => setRole("owner")} className="hidden peer" />
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 peer-checked:border-primary peer-checked:bg-primary transition-all"></div>
                    <span className="text-sm text-white/60 group-hover:text-white transition-colors">Station Owner</span>
                  </label>
                </div>
              </div>
            </>
          )}

          <button className="glass-btn-primary w-full py-4 mt-4" disabled={loading}>
            {loading ? "Processing..." : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-[10px] text-white/20 mt-8 uppercase tracking-widest">
          By proceeding, you agree to our <span className="text-white/40 underline cursor-pointer">Terms and Conditions</span>.
        </p>
      </div>
    </div>
  );
}
