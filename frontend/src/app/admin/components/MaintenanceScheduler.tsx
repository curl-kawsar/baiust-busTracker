"use client";

import React, { useState, useEffect } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { Plus, Wrench, AlertTriangle, CheckCircle, Calendar, X, Loader2 } from "lucide-react";

interface MaintenanceRecord {
    _id: string;
    busId: { _id: string; name: string; busId: string; vehicleType?: string; color?: string } | null;
    type: string;
    description?: string;
    scheduledDate: string;
    completedDate?: string;
    status: string;
    cost: number;
    odometerAtService?: number;
    vendor?: string;
    notes?: string;
    scheduledBy?: { name: string; email: string };
}

interface BusDue {
    _id: string;
    name: string;
    busId: string;
    currentOdometerReading: number;
    lastMaintenanceOdometer: number;
    maintenanceInterval: number;
}

const TYPE_LABELS: Record<string, string> = {
    oil_change: "Oil Change", tire_replacement: "Tire Replacement", brake_service: "Brake Service",
    engine_check: "Engine Check", ac_service: "AC Service", battery_replacement: "Battery Replacement",
    general_service: "General Service", body_repair: "Body Repair", electrical: "Electrical", other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    "in-progress": "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    overdue: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    cancelled: "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function MaintenanceScheduler() {
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [buses, setBuses] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, scheduled: 0, overdue: 0, completed: 0, totalCost: 0, busesDue: [] as BusDue[] });
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [formData, setFormData] = useState({ busId: "", type: "general_service", description: "", scheduledDate: "", cost: "", vendor: "", notes: "" });

    const fetchData = async () => {
        try {
            const params = statusFilter ? `?status=${statusFilter}` : "";
            const [recRes, statsRes, busRes] = await Promise.all([
                fetch(`${API_URL}/maintenance${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch(`${API_URL}/maintenance/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch(`${API_URL}/buses`, { headers: { Authorization: `Bearer ${getToken()}` } }),
            ]);
            if (recRes.ok) { const d = await recRes.json(); setRecords(d.data || []); }
            if (statsRes.ok) { const d = await statsRes.json(); setStats(d.data || stats); }
            if (busRes.ok) { setBuses(await busRes.json()); }
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, [statusFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await fetch(`${API_URL}/maintenance`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ ...formData, cost: formData.cost ? Number(formData.cost) : 0 }) });
            setShowForm(false);
            setFormData({ busId: "", type: "general_service", description: "", scheduledDate: "", cost: "", vendor: "", notes: "" });
            fetchData();
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const updateStatus = async (id: string, status: string) => {
        await fetch(`${API_URL}/maintenance/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ status, ...(status === "completed" ? { completedDate: new Date().toISOString() } : {}) }) });
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this record?")) return;
        await fetch(`${API_URL}/maintenance/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
        fetchData();
    };

    return (
        <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Scheduled</p><p className="text-2xl font-bold">{stats.scheduled}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-red-200/50 dark:border-red-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Overdue</p><p className="text-2xl font-bold text-red-600">{stats.overdue}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Completed</p><p className="text-2xl font-bold">{stats.completed}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Cost</p><p className="text-2xl font-bold">৳{stats.totalCost.toLocaleString()}</p></div>
                </div>
            </div>

            {/* Buses Due Alert */}
            {stats.busesDue.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3"><AlertTriangle size={18} className="text-red-500" /><h3 className="font-bold text-red-700 dark:text-red-400 text-sm">Vehicles Due for Maintenance</h3></div>
                    <div className="grid gap-2">
                        {stats.busesDue.map(b => (
                            <div key={b._id} className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl px-4 py-2.5 text-sm">
                                <div><span className="font-semibold">{b.name}</span> <span className="text-foreground/30 font-mono text-xs">({b.busId})</span></div>
                                <div className="text-xs text-red-500 font-semibold">{(b.currentOdometerReading - b.lastMaintenanceOdometer).toLocaleString()} km since last service</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Maintenance Schedule</h2>
                    <p className="text-sm text-foreground/40">{records.length} records</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="coord-input w-auto min-w-[140px]">
                        <option value="">All Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="overdue">Overdue</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 cta-gradient text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-shadow">
                        <Plus size={16} /> Schedule Service
                    </button>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-2xl w-full max-w-lg p-6 z-10">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold">Schedule Maintenance</h3>
                            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                            <select required value={formData.busId} onChange={e => setFormData({ ...formData, busId: e.target.value })} className="coord-input col-span-2">
                                <option value="">Select Vehicle</option>
                                {buses.map(b => <option key={b._id} value={b._id}>{b.name} ({b.busId})</option>)}
                            </select>
                            <select required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="coord-input">
                                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <input type="datetime-local" required value={formData.scheduledDate} onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })} className="coord-input" />
                            <input placeholder="Est. Cost (৳)" type="number" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} className="coord-input" />
                            <input placeholder="Vendor / Workshop" value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })} className="coord-input" />
                            <textarea placeholder="Description / Notes" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="coord-input col-span-2" rows={2} />
                            <button type="submit" disabled={loading} className="col-span-2 py-3 cta-gradient text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Calendar size={16} />}
                                Schedule
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Records */}
            <div className="grid gap-3">
                {records.length === 0 && (
                    <div className="text-center py-16 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
                        <Wrench size={32} className="mx-auto text-foreground/10 mb-2" />
                        <p className="text-foreground/30 text-sm">No maintenance records</p>
                    </div>
                )}
                {records.map(r => (
                    <div key={r._id} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 group">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: r.busId?.color || "#3b82f6" }}>
                                    <Wrench size={16} className="text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-sm">{r.busId?.name || "Unknown"}</h3>
                                        <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md font-semibold text-foreground/40">{TYPE_LABELS[r.type] || r.type}</span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                                    </div>
                                    {r.description && <p className="text-xs text-foreground/50 mt-1">{r.description}</p>}
                                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-foreground/40">
                                        <span>📅 {new Date(r.scheduledDate).toLocaleDateString()}</span>
                                        {r.vendor && <span>🏪 {r.vendor}</span>}
                                        {r.cost > 0 && <span>💰 ৳{r.cost.toLocaleString()}</span>}
                                        {r.odometerAtService && <span>🔢 {r.odometerAtService.toLocaleString()} km</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {r.status === "scheduled" || r.status === "overdue" ? (
                                    <>
                                        <button onClick={() => updateStatus(r._id, "in-progress")} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold hover:bg-amber-100 dark:hover:bg-amber-950/50">Start</button>
                                        <button onClick={() => updateStatus(r._id, "cancelled")} className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-foreground/40 rounded-lg text-[10px] font-bold hover:bg-gray-200 dark:hover:bg-zinc-700">Cancel</button>
                                    </>
                                ) : r.status === "in-progress" ? (
                                    <button onClick={() => updateStatus(r._id, "completed")} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950/50 flex items-center gap-1"><CheckCircle size={10} /> Complete</button>
                                ) : null}
                                <button onClick={() => handleDelete(r._id)} className="px-3 py-1.5 bg-red-50 dark:bg-red-950/30 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-950/50">Delete</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
