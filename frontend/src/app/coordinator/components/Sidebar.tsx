"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import {
    LogOut,
    Map as MapIcon,
    Bus as BusIcon,
    Users,
    Bell,
    MapPin,
    Fuel,
    Calendar,
    GitMerge as RouteIcon,
    X,
    Menu,
    ChevronRight,
} from "lucide-react";
import { TabType } from "../types";

const NAV_GROUPS = [
    {
        label: "Operations",
        items: [
            { id: "buses" as TabType, label: "Fleet", icon: BusIcon },
            { id: "crew" as TabType, label: "Crew", icon: Users },
            { id: "routes" as TabType, label: "Routes", icon: RouteIcon },
            { id: "pickups" as TabType, label: "Pickup Points", icon: MapPin },
        ],
    },
    {
        label: "Insights",
        items: [
            { id: "travel-history" as TabType, label: "Travel History", icon: Calendar },
            { id: "fuel-management" as TabType, label: "Fuel", icon: Fuel },
        ],
    },
    {
        label: "Communication",
        items: [
            { id: "announcements" as TabType, label: "Announcements", icon: Bell },
        ],
    },
];

interface SidebarProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    user: { role: string; email: string };
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, user, mobileOpen, setMobileOpen }: SidebarProps) {
    const router = useRouter();

    const initials = user.email
        .split("@")[0]
        .split(".")
        .map((s) => s[0]?.toUpperCase())
        .join("")
        .slice(0, 2);

    const handleNav = (tab: TabType) => {
        setActiveTab(tab);
        setMobileOpen(false);
    };

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Brand + User */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-foreground/10 flex items-center justify-center font-bold text-sm text-foreground">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm truncate text-foreground">{user.email.split("@")[0]}</p>
                        <p className="text-foreground/40 text-xs">{user.role}</p>
                    </div>
                </div>
                <div className="h-px bg-foreground/10" />
            </div>

            {/* Nav Groups */}
            <nav className="flex-1 px-3 space-y-6 overflow-y-auto no-scrollbar">
                {NAV_GROUPS.map((group) => (
                    <div key={group.label}>
                        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/25">
                            {group.label}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNav(item.id)}
                                        className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
                      ${isActive
                                                ? "bg-foreground/5 text-foreground"
                                                : "text-foreground/50 hover:text-foreground hover:bg-foreground/5"
                                            }
                    `}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                                        )}
                                        <item.icon size={18} className={isActive ? "text-primary" : "text-foreground/30 group-hover:text-foreground/60"} />
                                        <span className="flex-1 text-left">{item.label}</span>
                                        {isActive && <ChevronRight size={14} className="text-foreground/30" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 space-y-1 border-t border-foreground/10">
                <button
                    onClick={() => router.push("/")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-all"
                >
                    <MapIcon size={18} />
                    <span>Back to Map</span>
                </button>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                    <Menu size={20} />
                </button>
                <span className="font-semibold text-sm">
                    {NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label}
                </span>
                <div className="w-9" />
            </div>

            {/* Mobile Drawer Overlay */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-72 sidebar-gradient animate-slide-in-left">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-colors"
                        >
                            <X size={18} />
                        </button>
                        {sidebarContent}
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-64 sidebar-gradient z-40">
                {sidebarContent}
            </aside>
        </>
    );
}
