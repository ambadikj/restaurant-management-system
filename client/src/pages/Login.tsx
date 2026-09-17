import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { BrandLogo, BrandCrest } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", {
        username,
        password,
      });

      // 1. Save the JWT and user data to local storage
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      // 2. Redirect based on user role
      const userRole = response.data.user?.role;
      if (String(userRole).toLowerCase() === "kitchen") {
        navigate("/kitchen");
      } else if (String(userRole).toLowerCase() === "cashier") {
        navigate("/cashier");
      } else {
        navigate("/admin");
      }
    } catch (err: unknown) {
      // Type-safe error handling
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Invalid credentials. Please try again.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121214] text-neutral-100 font-sans antialiased selection:bg-[#FA2D48] selection:text-white relative overflow-hidden dark">
      {/* Apple Music Ambient Mesh Glow */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-96 w-96 rounded-full bg-[#FA2D48]/12 blur-3xl" />
      <div className="pointer-events-none fixed top-1/4 -right-40 h-[28rem] w-[28rem] rounded-full bg-violet-600/8 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 h-80 w-80 rounded-full bg-[#FA2D48]/6 blur-3xl" />

      {/* Top Header Bar matching Admin Layout */}
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#121214]/80 px-4 sm:px-6 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <BrandCrest className="h-8 w-8 shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-white uppercase leading-none font-sans">
              Serve_Sync
            </span>
            <span className="text-[10px] font-mono text-neutral-400 mt-0.5">
              CONSOLE v2.4
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono tracking-wide">WS: ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Centered Landscape Card Layout */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10">
        <div className="w-full max-w-4xl min-h-[440px] bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent border border-white/[0.09] rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col md:flex-row relative">
          {/* Subtle Ambient Bloom inside card */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#FA2D48]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />

          {/* Left Side: Clean Brand Identity (Balanced & Symmetrically Aligned) */}
          <div className="w-full md:w-1/2 p-8 md:p-12 bg-white/[0.02] border-b md:border-b-0 md:border-r border-white/[0.07] flex flex-col justify-between items-start relative z-10">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1f1f23] to-[#141416] border border-white/[0.12] shadow-xl shadow-black/50 mb-6">
                <BrandLogo size={24} />
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2 font-sans">
                Sign in
              </h1>
              <h2 className="text-xs font-semibold text-neutral-400 tracking-widest uppercase">
                Restaurant Management & POS System
              </h2>
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.06] w-full flex items-center justify-between text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span className="font-mono text-[11px] text-neutral-400 tracking-wider">TERMINAL READY</span>
              </div>
              <span className="font-mono text-[11px] text-neutral-500">v2.4</span>
            </div>
          </div>

          {/* Right Side: Credentials Form (Symmetric Padding & Vertical Alignment) */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative z-10">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                Staff Credentials
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Enter your username and password to access the console
              </p>
            </div>

            {/* Error Feedback message */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300 animate-in fade-in backdrop-blur-md">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-semibold text-neutral-300 tracking-wider uppercase block">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10 bg-white/[0.05] hover:bg-white/[0.07] border-white/[0.1] focus:border-[#FA2D48] text-white placeholder:text-neutral-500 h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-[#FA2D48]/30 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-neutral-300 tracking-wider uppercase block">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10 bg-white/[0.05] hover:bg-white/[0.07] border-white/[0.1] focus:border-[#FA2D48] text-white placeholder:text-neutral-500 h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-[#FA2D48]/30 transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-gradient-to-r from-[#FA2D48] via-[#FF4565] to-[#FB7185] hover:opacity-95 text-white font-semibold py-2.5 h-11 rounded-xl shadow-lg shadow-[#FA2D48]/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-neutral-500 font-mono relative z-10 shrink-0">
        Serve_Sync Real-Time Restaurant Management • System Version 2.4
      </footer>
    </div>
  );
}