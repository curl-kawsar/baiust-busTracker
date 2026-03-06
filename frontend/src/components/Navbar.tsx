"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Moon, Sun, User, LogOut, GitMerge, Check, ChevronDown, LayoutDashboard } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { getUser, getToken, logout } from "@/lib/auth";
import Link from "next/link";
import type { TransportRoute } from "./LiveMap";

interface NavbarProps {
  routes?: TransportRoute[];
  selectedRouteIds?: string[];
  onToggleRoute?: (id: string) => void;
  colors?: string[];
}

export function Navbar({ routes = [], selectedRouteIds = [], onToggleRoute, colors = [] }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [isRouteListOpen, setIsRouteListOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const routeRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const token = getToken();
  const user = getUser();
  const isLoggedIn = !!token && !!user;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (routeRef.current && !routeRef.current.contains(e.target as Node)) setIsRouteListOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeCount = selectedRouteIds.length;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-center">
      <nav className="w-full max-w-5xl bg-white border border-gray-200 shadow-sm rounded-full px-2 py-2 sm:px-4 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-3 p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-black"
        >
          <span className="font-bold text-[17px] leading-tight tracking-tight text-gray-900 pl-2">
            Loopr: BAIUST Transit
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Routes Dropdown */}
          {routes.length > 0 && (
            <div className="relative" ref={routeRef}>
              <button
                onClick={() => setIsRouteListOpen(!isRouteListOpen)}
                className={`flex items-center justify-center gap-1.5 min-w-11 min-h-11 px-3 text-sm font-semibold rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-black ${
                  isRouteListOpen ? "bg-black text-white" : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                }`}
              >
                <GitMerge size={18} />
                <span className="hidden sm:inline">Routes</span>
                {activeCount > 0 && (
                  <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                    {activeCount}
                  </span>
                )}
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isRouteListOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isRouteListOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-2xl animate-fade-in-down z-50">
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                    {routes.map((r, idx) => {
                      const isSelected = selectedRouteIds.includes(r._id);
                      const color = colors[idx % colors.length] || "#6366f1";

                      return (
                        <button
                          key={r._id}
                          onClick={() => onToggleRoute?.(r._id)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                            isSelected
                              ? "bg-gray-100 dark:bg-gray-800 ring-1 ring-primary/20"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
                          }`}
                        >
                          <div className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: color }} />
                          <div className="flex-1 text-left min-w-0">
                            <p
                              className={`font-bold text-sm leading-tight ${isSelected ? "text-primary" : "text-gray-900 dark:text-gray-100"}`}
                            >
                              {r.name}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-0.5 truncate">
                              {r.startPointId?.name || r.startName} → {r.endPointId?.name || r.endName}
                            </p>
                          </div>
                          {isSelected ? (
                            <div className="bg-primary text-white p-1 rounded-full shadow-sm shrink-0">
                              <Check size={10} strokeWidth={4} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-600 group-hover:border-primary/30 transition-colors shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <Link
            href="/announcements"
            className="flex items-center justify-center min-w-11 min-h-11 px-3 text-sm font-semibold rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-black text-gray-700 hover:text-gray-900"
            aria-label="Announcements"
          >
            <Bell size={20} className="sm:hidden" />
            <span className="hidden sm:inline">Notices</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="flex items-center justify-center min-w-11 min-h-11 rounded-full hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-black"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {isLoggedIn ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center justify-center min-w-11 min-h-11 gap-2 bg-black text-white px-4 sm:px-5 rounded-full font-semibold hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black"
              >
                <User size={18} />
                <span className="hidden sm:inline truncate max-w-24">{user?.name?.split(" ")[0] || "Me"}</span>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-2xl animate-fade-in-down z-50">
                  <div className="px-3 py-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  {(user?.role === "Admin" || user?.role === "Coordinator") && (
                    <Link
                      href={user?.role === "Admin" ? "/admin" : "/coordinator"}
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-semibold"
                    >
                      <LayoutDashboard size={16} />
                      Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-semibold"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center min-w-11 min-h-11 gap-2 bg-black text-white px-5 sm:px-6 rounded-full font-semibold hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black"
            >
              <User size={18} />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
