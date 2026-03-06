"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginApi } from "@/lib/auth";
import { Mail, Lock, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await loginApi(email, password);

      if (!response.success) {
        setError(response.error?.message || "Login failed");
      } else {
        const { token, user } = response.data;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        if (user.role === "Admin") router.push("/admin");
        else if (user.role === "Coordinator") router.push("/coordinator");
        else router.push("/");
      }
    } catch (err) {
      setError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-[#e5e3df]">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-gray-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Map Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/login-map-bg.png"
          alt=""
          className="w-full h-full object-cover grayscale opacity-60 dark:opacity-20 dark:invert"
        />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[400px] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl px-8 py-10 sm:px-10 sm:py-12 z-10 relative">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 bg-foreground rounded-2xl flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-background">
              <path d="M8 16c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="8" cy="18" r="1.5" fill="currentColor" />
              <circle cx="16" cy="18" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-[22px] sm:text-[26px] font-bold text-foreground text-center leading-tight mb-8">
          What's your email<br />and password?
        </h1>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-5 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          {/* Email */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none">
              <Mail size={18} strokeWidth={2.5} />
            </div>
            <input
              type="email"
              required
              aria-label="Email address"
              className="w-full pl-12 pr-4 py-4 bg-[#eeeeee] dark:bg-zinc-800 rounded-xl text-foreground text-[15px] placeholder:text-foreground/40 border-0 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none">
              <Lock size={18} strokeWidth={2.5} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              aria-label="Password"
              className="w-full pl-12 pr-12 py-4 bg-[#eeeeee] dark:bg-zinc-800 rounded-xl text-foreground text-[15px] placeholder:text-foreground/40 border-0 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-foreground text-background font-semibold text-[15px] rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity mt-1"
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        {/* Forgot Password */}
        <div className="mt-6 text-center">
          <a href="#" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
