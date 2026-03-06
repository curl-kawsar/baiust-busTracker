"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, getToken, getUser } from "@/lib/auth";

import AdminSidebar from "./components/AdminSidebar";
import UserManager from "./components/UserManager";
import CoordinatorManager from "./components/CoordinatorManager";
import AuditLogs from "./components/AuditLogs";
import MaintenanceScheduler from "./components/MaintenanceScheduler";
import ReportGenerator from "./components/ReportGenerator";

// Inline lightweight components for travel history, fuel, and settings
import {
  MapPin,
  Fuel,
  BarChart3,
  Calendar,
  Settings,
  Save,
} from "lucide-react";

type TabType = "users" | "coordinators" | "audit-logs" | "maintenance" | "reports" | "travel-history" | "fuel-management" | "platform-settings";

const TAB_TITLES: Record<TabType, { title: string; subtitle: string }> = {
  users: { title: "User Management", subtitle: "View, create, and manage all platform users" },
  coordinators: { title: "Coordinators", subtitle: "Manage transport coordinator accounts" },
  "audit-logs": { title: "Audit Logs", subtitle: "Track all actions across the platform" },
  maintenance: { title: "Maintenance Scheduler", subtitle: "Schedule and track vehicle service records" },
  reports: { title: "Report Generator", subtitle: "Generate printable fuel, travel, and maintenance reports" },
  "travel-history": { title: "Travel History", subtitle: "Review past trips, distances, and passenger data" },
  "fuel-management": { title: "Fuel Management", subtitle: "Track fuel consumption and costs across the fleet" },
  "platform-settings": { title: "Platform Settings", subtitle: "Configure fuel prices, currencies, and system defaults" },
};

interface TravelHistory {
  _id: string; busId: any; routeId: any; departureTime: string; distance: number; status: string; passengers: number;
}
interface FuelRecord {
  _id: string; busId: any; date: string; liters: number; costPerLiter: number; totalCost: number; fuelType: string; fuelStation?: string; addedBy: any;
}
interface PlatformSetting {
  _id: string; key: string; value: any; description: string; category: string; dataType: string; lastUpdatedBy: any;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; email: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("users");

  // Data for inline tabs
  const [travelHistory, setTravelHistory] = useState<TravelHistory[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const usr = getUser();
    if (!usr || usr.role !== "Admin") { router.push("/login"); return; }
    setUser(usr);
  }, [router]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [travelRes, fuelRes, settingsRes, busesRes] = await Promise.all([
        fetch(`${API_URL}/travel-history?limit=50`, { headers }),
        fetch(`${API_URL}/fuel?limit=50`, { headers }),
        fetch(`${API_URL}/settings`, { headers }),
        fetch(`${API_URL}/buses`, { headers }),
      ]);
      if (travelRes.ok) { const data = await travelRes.json(); setTravelHistory(data.data || []); }
      if (fuelRes.ok) { const data = await fuelRes.json(); setFuelRecords(data.data || []); }
      if (settingsRes.ok) { setPlatformSettings(await settingsRes.json()); }
      if (busesRes.ok) { setBuses(await busesRes.json()); }
    } catch (err) { console.error(err); }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const res = await fetch(`${API_URL}/settings/${key}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ value }) });
      if (res.ok) { loadData(); setMsg("Setting updated"); setTimeout(() => setMsg(""), 3000); }
    } catch { setMsg("Failed to update"); }
  };

  if (!user) return null;

  const currentTab = TAB_TITLES[activeTab];

  return (
    <div className="min-h-dvh bg-background">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-dvh">
        {/* Page Header */}
        <div className="border-b border-gray-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
          <div className="px-6 lg:px-10 py-6">
            <h1 className="text-2xl font-bold tracking-tight">{currentTab.title}</h1>
            <p className="text-sm text-foreground/40 mt-0.5">{currentTab.subtitle}</p>
          </div>
        </div>

        {/* Toast */}
        {msg && (
          <div className="mx-6 lg:mx-10 mt-4 p-3 rounded-xl text-sm font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
            {msg}
          </div>
        )}

        {/* Content */}
        <div className="px-6 lg:px-10 py-6 lg:py-8">
          {activeTab === "users" && <UserManager />}
          {activeTab === "coordinators" && <CoordinatorManager />}
          {activeTab === "audit-logs" && <AuditLogs />}
          {activeTab === "maintenance" && <MaintenanceScheduler />}
          {activeTab === "reports" && <ReportGenerator />}

          {activeTab === "travel-history" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-zinc-800">
                        {["Bus", "Route", "Departure", "Distance", "Passengers", "Status"].map(h => (
                          <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {travelHistory.map((trip) => (
                        <tr key={trip._id} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-medium">{trip.busId?.name || "N/A"}</td>
                          <td className="px-5 py-3.5 text-sm text-foreground/60">{trip.routeId?.name || "N/A"}</td>
                          <td className="px-5 py-3.5 text-sm text-foreground/60">{new Date(trip.departureTime).toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-sm">{trip.distance} km</td>
                          <td className="px-5 py-3.5 text-sm">{trip.passengers}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${trip.status === "completed" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : trip.status === "in-progress" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                                  : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                              }`}>{trip.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "fuel-management" && (
            <div className="space-y-6">
              {/* Fuel KPIs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20" />
                  <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Cost</p><p className="text-2xl font-bold">৳{fuelRecords.reduce((s, r) => s + r.totalCost, 0).toLocaleString()}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/30 p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20" />
                  <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Liters</p><p className="text-2xl font-bold">{fuelRecords.reduce((s, r) => s + r.liters, 0).toLocaleString()}L</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" />
                  <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">This Month</p><p className="text-2xl font-bold">{fuelRecords.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).length} records</p></div>
                </div>
              </div>
              {/* Fuel Table */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-zinc-800">
                        {["Bus", "Date", "Type", "Liters", "Cost/L", "Total", "Added By"].map(h => (
                          <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fuelRecords.map((r) => (
                        <tr key={r._id} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-medium">{r.busId?.name || "N/A"}</td>
                          <td className="px-5 py-3.5 text-sm text-foreground/60">{new Date(r.date).toLocaleDateString()}</td>
                          <td className="px-5 py-3.5 text-sm capitalize">{r.fuelType}</td>
                          <td className="px-5 py-3.5 text-sm">{r.liters}L</td>
                          <td className="px-5 py-3.5 text-sm">৳{r.costPerLiter}</td>
                          <td className="px-5 py-3.5 text-sm font-medium">৳{r.totalCost.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-sm text-foreground/50">{r.addedBy?.name || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "platform-settings" && (
            <div className="space-y-6">
              {["fuel", "currency", "reporting", "general"].map((category) => {
                const categorySettings = platformSettings.filter((s) => s.category === category);
                if (categorySettings.length === 0) return null;
                return (
                  <div key={category} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/30 mb-4">
                      {category === "fuel" ? "Fuel Prices" : category} Settings
                    </h3>
                    <div className="space-y-3">
                      {categorySettings.map((setting) => (
                        <div key={setting._id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{setting.description}</p>
                            <p className="text-xs text-foreground/30 font-mono">{setting.key}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {setting.dataType === "number" ? (
                              <input type="number" step="0.01" defaultValue={setting.value} className="coord-input w-24" onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== setting.value) updateSetting(setting.key, v); }} />
                            ) : setting.dataType === "boolean" ? (
                              <select defaultValue={setting.value.toString()} className="coord-input w-auto" onChange={(e) => updateSetting(setting.key, e.target.value === "true")}>
                                <option value="true">True</option>
                                <option value="false">False</option>
                              </select>
                            ) : (
                              <input type="text" defaultValue={setting.value} className="coord-input w-32" onBlur={(e) => { if (e.target.value !== setting.value) updateSetting(setting.key, e.target.value); }} />
                            )}
                            {category === "fuel" && <span className="text-xs text-foreground/30">৳/L</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
