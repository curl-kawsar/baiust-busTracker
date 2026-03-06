"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URL, getToken, getUser } from "@/lib/auth";
import { TabType, Bus, Crew, Route, Announcement, Pickup, TravelHistory, FuelRecord } from "./types";

import Sidebar from "./components/Sidebar";
import BusManager from "./components/BusManager";
import CrewManager from "./components/CrewManager";
import RouteManager from "./components/RouteManager";
import AnnouncementManager from "./components/AnnouncementManager";
import PickupManager from "./components/PickupManager";
import TravelHistoryManager from "./components/TravelHistoryManager";
import FuelManager from "./components/FuelManager";

const TAB_TITLES: Record<TabType, { title: string; subtitle: string }> = {
  buses: { title: "Fleet Management", subtitle: "Register, monitor, and manage your vehicles" },
  crew: { title: "Crew Management", subtitle: "Assign drivers and supervisors to your fleet" },
  routes: { title: "Transport Lines", subtitle: "Plan routes with start, end, and waypoints" },
  announcements: { title: "Announcements", subtitle: "Post updates and notices for your team" },
  pickups: { title: "Pickup Points", subtitle: "Set geolocated pickup locations with schedules" },
  "travel-history": { title: "Travel History", subtitle: "Review past trips, distances, and passenger data" },
  "fuel-management": { title: "Fuel Management", subtitle: "Track fuel consumption and costs" },
};

export default function CoordinatorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; email: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("buses");

  const [buses, setBuses] = useState<Bus[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [travelHistory, setTravelHistory] = useState<TravelHistory[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);

  const fetchData = useCallback(async () => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [busRes, creRes, routesRes, annRes, pickRes, travelRes, fuelRes] = await Promise.all([
        fetch(`${API_URL}/buses`, { headers }),
        fetch(`${API_URL}/crews`, { headers }),
        fetch(`${API_URL}/routes`, { headers }),
        fetch(`${API_URL}/announcements`, { headers }),
        fetch(`${API_URL}/pickups`, { headers }),
        fetch(`${API_URL}/travel-history?limit=50`, { headers }),
        fetch(`${API_URL}/fuel?limit=50`, { headers }),
      ]);
      if (busRes.ok) setBuses(await busRes.json());
      if (creRes.ok) setCrews(await creRes.json());
      if (routesRes.ok) setRoutes(await routesRes.json());
      if (annRes.ok) setAnnouncements(await annRes.json());
      if (pickRes.ok) setPickups(await pickRes.json());
      if (travelRes.ok) { const data = await travelRes.json(); setTravelHistory(data.data || []); }
      if (fuelRes.ok) { const data = await fuelRes.json(); setFuelRecords(data.data || []); }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const usr = getUser();
    if (!usr || usr.role !== "Coordinator") { router.push("/login"); return; }
    setUser(usr);
  }, [router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  if (!user) return null;

  const currentTab = TAB_TITLES[activeTab];

  return (
    <div className="min-h-dvh bg-background">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content */}
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-dvh">
        {/* Page Header */}
        <div className="border-b border-gray-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
          <div className="px-6 lg:px-10 py-6">
            <h1 className="text-2xl font-bold tracking-tight">{currentTab.title}</h1>
            <p className="text-sm text-foreground/40 mt-0.5">{currentTab.subtitle}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 lg:px-10 py-6 lg:py-8 animate-fade-in-up">
          {activeTab === "buses" && <BusManager buses={buses} refresh={fetchData} />}
          {activeTab === "crew" && <CrewManager crews={crews} buses={buses} refresh={fetchData} />}
          {activeTab === "routes" && <RouteManager routes={routes} pickups={pickups} buses={buses} refresh={fetchData} />}
          {activeTab === "announcements" && <AnnouncementManager announcements={announcements} refresh={fetchData} />}
          {activeTab === "pickups" && <PickupManager pickups={pickups} refresh={fetchData} />}
          {activeTab === "travel-history" && <TravelHistoryManager travelHistory={travelHistory} buses={buses} refresh={fetchData} />}
          {activeTab === "fuel-management" && <FuelManager fuelRecords={fuelRecords} buses={buses} refresh={fetchData} />}
        </div>
      </main>
    </div>
  );
}
