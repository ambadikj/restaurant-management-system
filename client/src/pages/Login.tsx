import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChefHat,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
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

      // 2. Redirect to the admin dashboard
      navigate("/admin");
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
    <div className="min-h-screen flex flex-col bg-neutral-50/60 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100">
      {/* Top Header Bar matching Admin Layout */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/95">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <ChefHat className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-50 uppercase leading-none">
              Serve_Sync
            </span>
            <span className="text-[10px] font-mono text-neutral-400 mt-0.5">
              CONSOLE v2.4
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono">WS: ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Centered Landscape Card Layout */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xl shadow-neutral-200/30 dark:shadow-neutral-950/40 overflow-hidden flex flex-col md:flex-row">
          {/* Left Side: Clean Brand Identity */}
          <div className="w-full md:w-1/2 p-8 md:p-12 bg-neutral-50/70 dark:bg-neutral-900/50 border-b md:border-b-0 md:border-r border-neutral-200/80 dark:border-neutral-800 flex flex-col justify-center items-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25 mb-5">
              <ChefHat className="h-6 w-6" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">
              Sign in
            </h1>
            <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tracking-widest uppercase">
              Restaurant Management & POS System
            </h2>
          </div>

          {/* Right Side: Credentials Form */}
          <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Staff Credentials
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Enter your username and password to access the console
              </p>
            </div>

            {/* Error Feedback message */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200/80 bg-red-50/80 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider uppercase">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-9 bg-neutral-50/50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 h-10 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider uppercase">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-9 bg-neutral-50/50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 h-10 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 h-10 rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
      <footer className="py-4 text-center text-xs text-neutral-400 dark:text-neutral-600 font-mono">
        Serve_Sync Real-Time Restaurant Management • System Version 2.4
      </footer>
    </div>
  );
}