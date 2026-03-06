"use client";

import React, { useState } from "react";
import { Bus, VEHICLE_TYPES, FLEET_COLORS } from "../types";
import { API_URL, getToken } from "@/lib/auth";
import {
    Plus,
    Trash2,
    Loader2,
    CheckCircle,
    XCircle,
    Bus as BusIcon,
    Edit2,
    Fuel,
    Lock,
    Unlock,
    X,
    Hand,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useRef } from "react";

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
    return (
        <div className={`relative overflow-hidden rounded-2xl border border-${accent}-200/50 dark:border-${accent}-800/30 p-5`}>
            <div className={`absolute inset-0 bg-gradient-to-br from-${accent}-50 to-${accent}-100/50 dark:from-${accent}-950/40 dark:to-${accent}-900/20`} />
            <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">{label}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
            </div>
        </div>
    );
}

// ─── Bus Card ────────────────────────────────────────────────
function BusCard({
    bus,
    onEdit,
    onAddFuel,
    onDelete,
}: {
    bus: Bus;
    onEdit: () => void;
    onAddFuel: () => void;
    onDelete: () => void;
}) {
    const [engineLocked, setEngineLocked] = useState(false);
    const [lockStep, setLockStep] = useState<"idle" | "confirm" | "typing" | "holding">("idle");
    const [confirmText, setConfirmText] = useState("");
    const [holdProgress, setHoldProgress] = useState(0);
    const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const HOLD_DURATION = 2000;
    const HOLD_TICK = 50;

    const startEngineLockFlow = () => setLockStep("confirm");
    const cancelLockFlow = () => {
        setLockStep("idle");
        setConfirmText("");
        setHoldProgress(0);
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
    const proceedToTyping = () => { setLockStep("typing"); setConfirmText(""); };
    const proceedToHold = () => { setLockStep("holding"); setHoldProgress(0); };

    const handleHoldStart = () => {
        let elapsed = 0;
        holdTimerRef.current = setInterval(() => {
            elapsed += HOLD_TICK;
            setHoldProgress(Math.min((elapsed / HOLD_DURATION) * 100, 100));
            if (elapsed >= HOLD_DURATION) {
                if (holdTimerRef.current) clearInterval(holdTimerRef.current);
                setEngineLocked(!engineLocked);
                setLockStep("idle");
                setConfirmText("");
                setHoldProgress(0);
            }
        }, HOLD_TICK);
    };

    const handleHoldEnd = () => {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        if (holdProgress < 100) setHoldProgress(0);
    };

    const isConfirmTextValid = confirmText.trim().toLowerCase() === bus.name.trim().toLowerCase();

    return (
        <div className="group bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: bus.color || "#3b82f6" }}
                    >
                        <BusIcon size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base">{bus.name}</h3>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                                {bus.vehicleType || "Bus"}
                            </span>
                            <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${bus.isActive !== false
                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                        : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                                    }`}
                            >
                                {bus.isActive !== false ? "Active" : "Inactive"}
                            </span>
                            {engineLocked && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                                    <Lock size={10} /> Locked
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-foreground/40 font-mono mt-0.5">{bus.busId}{bus.licensePlate && ` · ${bus.licensePlate}`}</p>
                    </div>
                </div>

                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={startEngineLockFlow} className={`p-2 rounded-lg transition-colors ${engineLocked ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"}`} title={engineLocked ? "Unlock Engine" : "Lock Engine"}>
                        {engineLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <button onClick={onAddFuel} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors" title="Add Fuel">
                        <Fuel size={16} />
                    </button>
                    <button onClick={onEdit} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors" title="Edit">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={onDelete} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs">
                {bus.capacity && (
                    <div>
                        <span className="text-foreground/40">Capacity</span>
                        <p className="font-semibold">{bus.capacity} seats</p>
                    </div>
                )}
                {bus.expectedMileage && (
                    <div>
                        <span className="text-foreground/40">Mileage</span>
                        <p className="font-semibold">{bus.expectedMileage} km/L</p>
                    </div>
                )}
                {bus.preferredFuelType && (
                    <div>
                        <span className="text-foreground/40">Fuel</span>
                        <p className="font-semibold capitalize">{bus.preferredFuelType}</p>
                    </div>
                )}
                {bus.currentOdometerReading && (
                    <div>
                        <span className="text-foreground/40">Odometer</span>
                        <p className="font-semibold">{bus.currentOdometerReading.toLocaleString()} km</p>
                    </div>
                )}
            </div>

            {bus.notes && <p className="text-xs text-foreground/40 mt-3 italic">{bus.notes}</p>}

            {/* Engine Lock Modal */}
            {lockStep !== "idle" &&
                createPortal(
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelLockFlow} />
                        <div className="relative z-10 bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-2xl w-full max-w-md p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                                    <Lock size={18} />
                                    <span>{engineLocked ? "Unlock Engine" : "Lock Engine"}</span>
                                </div>
                                <button onClick={cancelLockFlow} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bus.color || "#3b82f6" }}>
                                    <BusIcon size={14} className="text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">{bus.name}</p>
                                    <p className="text-xs text-foreground/40">{bus.busId} · {bus.vehicleType || "Bus"}</p>
                                </div>
                            </div>

                            {lockStep === "confirm" && (
                                <div className="space-y-4">
                                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                        <p className="text-sm text-amber-800 dark:text-amber-300">
                                            {engineLocked
                                                ? "Unlocking will restore engine control. Make sure the vehicle is safe to operate."
                                                : "Locking the engine will remotely disable the vehicle. This is an emergency action — the vehicle will not be able to move until unlocked."}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={cancelLockFlow} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
                                        <button onClick={proceedToTyping} className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors">I understand, proceed</button>
                                    </div>
                                </div>
                            )}

                            {lockStep === "typing" && (
                                <div className="space-y-4">
                                    <p className="text-sm text-foreground/60">Type <strong className="text-foreground">{bus.name}</strong> to confirm:</p>
                                    <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={bus.name} autoFocus className="w-full px-4 py-2.5 bg-background border-2 border-amber-200 dark:border-amber-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={cancelLockFlow} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
                                        <button onClick={proceedToHold} disabled={!isConfirmTextValid} className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
                                    </div>
                                </div>
                            )}

                            {lockStep === "holding" && (
                                <div className="space-y-4">
                                    <p className="text-sm text-foreground/60 font-medium">Hold the button below for 2 seconds to {engineLocked ? "unlock" : "lock"} the engine.</p>
                                    <button
                                        onMouseDown={handleHoldStart} onMouseUp={handleHoldEnd} onMouseLeave={handleHoldEnd} onTouchStart={handleHoldStart} onTouchEnd={handleHoldEnd}
                                        className={`relative w-full py-3.5 rounded-xl text-sm font-bold text-white overflow-hidden select-none ${engineLocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
                                    >
                                        <div className={`absolute inset-0 ${engineLocked ? "bg-emerald-400/40" : "bg-red-400/40"}`} style={{ width: `${holdProgress}%` }} />
                                        <span className="relative flex items-center justify-center gap-2">
                                            {engineLocked ? <Unlock size={16} /> : <Lock size={16} />}
                                            {holdProgress > 0 && holdProgress < 100
                                                ? `Hold… ${Math.ceil((HOLD_DURATION - (holdProgress / 100) * HOLD_DURATION) / 1000)}s`
                                                : engineLocked ? "Press & Hold to Unlock" : "Press & Hold to Lock"}
                                        </span>
                                    </button>
                                    <button onClick={cancelLockFlow} className="w-full text-sm text-foreground/40 hover:text-foreground transition-colors text-center">Cancel</button>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}

// ─── Edit Bus Form ────────────────────────────────────────────
function EditBusForm({ bus, onSave, onCancel, loading }: { bus: Bus; onSave: (bus: Bus) => void; onCancel: () => void; loading: boolean }) {
    const [editData, setEditData] = useState(bus);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(editData); }} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Edit: {bus.name}</h3>
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors">Cancel</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm cta-gradient text-white rounded-xl disabled:opacity-50 transition-opacity">{loading ? "Saving..." : "Save"}</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="Vehicle Name" value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="coord-input" required />
                <select value={editData.vehicleType || "Bus"} onChange={(e) => setEditData({ ...editData, vehicleType: e.target.value })} className="coord-input">
                    {VEHICLE_TYPES.map((vt) => <option key={vt} value={vt}>{vt}</option>)}
                </select>
                <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-foreground/40 pl-1">Color</label>
                    <div className="flex flex-wrap gap-2">
                        {FLEET_COLORS.map((fc) => (
                            <button key={fc.value} type="button" title={fc.label} onClick={() => setEditData({ ...editData, color: fc.value })} className={`w-7 h-7 rounded-full border-2 border-white shadow-sm transition-all hover:scale-110 ${(editData.color || "#3b82f6") === fc.value ? "ring-2 ring-offset-2 ring-foreground" : ""}`} style={{ backgroundColor: fc.value }} />
                        ))}
                    </div>
                </div>
                <input type="text" placeholder="License Plate" value={editData.licensePlate || ""} onChange={(e) => setEditData({ ...editData, licensePlate: e.target.value })} className="coord-input" />
                <input type="number" placeholder="Capacity" value={editData.capacity || ""} onChange={(e) => setEditData({ ...editData, capacity: e.target.value ? Number(e.target.value) : undefined })} className="coord-input" />
                <input type="number" step="0.1" placeholder="Mileage (km/L)" value={editData.expectedMileage || ""} onChange={(e) => setEditData({ ...editData, expectedMileage: e.target.value ? Number(e.target.value) : undefined })} className="coord-input" />
                <input type="number" placeholder="Tank Capacity (L)" value={editData.fuelTankCapacity || ""} onChange={(e) => setEditData({ ...editData, fuelTankCapacity: e.target.value ? Number(e.target.value) : undefined })} className="coord-input" />
                <select value={editData.preferredFuelType || "diesel"} onChange={(e) => setEditData({ ...editData, preferredFuelType: e.target.value })} className="coord-input">
                    <option value="diesel">Diesel</option><option value="petrol">Petrol</option><option value="cng">CNG</option><option value="octane">Octane</option>
                </select>
                <input type="number" placeholder="Odometer (km)" value={editData.currentOdometerReading || ""} onChange={(e) => setEditData({ ...editData, currentOdometerReading: e.target.value ? Number(e.target.value) : undefined })} className="coord-input" />
                <input type="number" placeholder="Maintenance Interval (km)" value={editData.maintenanceInterval || ""} onChange={(e) => setEditData({ ...editData, maintenanceInterval: e.target.value ? Number(e.target.value) : undefined })} className="coord-input" />
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="isActive" checked={editData.isActive !== false} onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })} className="w-4 h-4 accent-primary" />
                    <label htmlFor="isActive" className="text-sm font-medium">Active</label>
                </div>
                <textarea placeholder="Notes" value={editData.notes || ""} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} className="coord-input md:col-span-2" rows={2} />
            </div>
        </form>
    );
}

// ─── Fuel Form (inline) ──────────────────────────────────────
function FuelForm({
    busName, preferredFuelType, fuelFormData, setFuelFormData, onSubmit, onCancel, loading,
}: {
    busName: string; preferredFuelType?: string; fuelFormData: any; setFuelFormData: (d: any) => void; onSubmit: () => void; onCancel: () => void; loading: boolean;
}) {
    return (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Fuel Record — {busName}</h4>
                <button type="button" onClick={onCancel} className="text-xs text-foreground/40 hover:text-foreground transition-colors">Cancel</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input type="number" step="0.01" placeholder="Liters" value={fuelFormData.liters} onChange={(e) => setFuelFormData({ ...fuelFormData, liters: e.target.value })} className="coord-input" required />
                <input type="number" step="0.01" placeholder="Cost/L (৳)" value={fuelFormData.costPerLiter} onChange={(e) => setFuelFormData({ ...fuelFormData, costPerLiter: e.target.value })} className="coord-input" required />
                <select value={fuelFormData.fuelType} onChange={(e) => setFuelFormData({ ...fuelFormData, fuelType: e.target.value })} className="coord-input">
                    <option value={preferredFuelType || "diesel"}>{(preferredFuelType || "diesel").charAt(0).toUpperCase() + (preferredFuelType || "diesel").slice(1)}</option>
                    {preferredFuelType !== "diesel" && <option value="diesel">Diesel</option>}
                    {preferredFuelType !== "petrol" && <option value="petrol">Petrol</option>}
                    {preferredFuelType !== "cng" && <option value="cng">CNG</option>}
                </select>
                <input type="text" placeholder="Station" value={fuelFormData.fuelStation} onChange={(e) => setFuelFormData({ ...fuelFormData, fuelStation: e.target.value })} className="coord-input" />
                <input type="datetime-local" value={fuelFormData.time} onChange={(e) => setFuelFormData({ ...fuelFormData, time: e.target.value })} className="coord-input" />
                <button type="submit" disabled={loading || !fuelFormData.liters || !fuelFormData.costPerLiter} className="cta-gradient text-white rounded-xl text-sm font-semibold disabled:opacity-50 py-2.5 col-span-1">
                    {loading ? "Adding..." : `Add (৳${fuelFormData.liters && fuelFormData.costPerLiter ? (Number(fuelFormData.liters) * Number(fuelFormData.costPerLiter)).toFixed(0) : "0"})`}
                </button>
            </form>
        </div>
    );
}

// ─── Main BusManager ─────────────────────────────────────────
export default function BusManager({ buses, refresh }: { buses: Bus[]; refresh: () => void }) {
    const [loading, setLoading] = useState(false);
    const [busIdInput, setBusIdInput] = useState("");
    const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error" | "not_found">("idle");
    const [editingBus, setEditingBus] = useState<Bus | null>(null);
    const [showFuelForm, setShowFuelForm] = useState<string | null>(null);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [fuelFormData, setFuelFormData] = useState({ liters: "", costPerLiter: "", fuelType: "diesel", odometer: "", fuelStation: "", notes: "", time: "" });

    const testBusConnection = async () => {
        if (!busIdInput.trim()) return;
        setTestStatus("testing");
        try {
            const res = await fetch(`${API_URL}/hardware/data/${busIdInput.trim()}`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (!res.ok) { setTestStatus("error"); return; }
            const data = await res.json();
            setTestStatus(data?.device_id ? "success" : "not_found");
        } catch { setTestStatus("error"); }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const data: any = Object.fromEntries(formData);
        if (data.capacity) data.capacity = Number(data.capacity);
        if (data.expectedMileage) data.expectedMileage = Number(data.expectedMileage);
        if (data.fuelTankCapacity) data.fuelTankCapacity = Number(data.fuelTankCapacity);
        if (data.currentOdometerReading) data.currentOdometerReading = Number(data.currentOdometerReading);
        if (data.maintenanceInterval) data.maintenanceInterval = Number(data.maintenanceInterval);
        try {
            await fetch(`${API_URL}/buses`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(data) });
            form.reset(); setBusIdInput(""); setTestStatus("idle"); refresh();
        } finally { setLoading(false); }
    };

    const handleUpdate = async (bus: Bus) => {
        setLoading(true);
        try {
            await fetch(`${API_URL}/buses/${bus._id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(bus) });
            setEditingBus(null); refresh();
        } finally { setLoading(false); }
    };

    const handleAddFuel = async (busId: string) => {
        setLoading(true);
        try {
            await fetch(`${API_URL}/fuel`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ busId, liters: Number(fuelFormData.liters), costPerLiter: Number(fuelFormData.costPerLiter), fuelType: fuelFormData.fuelType, odometer: fuelFormData.odometer ? Number(fuelFormData.odometer) : undefined, fuelStation: fuelFormData.fuelStation || undefined, notes: fuelFormData.notes || undefined, date: fuelFormData.time ? new Date(fuelFormData.time).toISOString() : undefined }) });
            setShowFuelForm(null); setFuelFormData({ liters: "", costPerLiter: "", fuelType: "diesel", odometer: "", fuelStation: "", notes: "", time: "" }); refresh();
        } finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this vehicle?")) return;
        await fetch(`${API_URL}/buses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
        refresh();
    };

    const activeCount = buses.filter((b) => b.isActive !== false).length;

    return (
        <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Total Vehicles" value={buses.length} accent="blue" />
                <KpiCard label="Active" value={activeCount} accent="emerald" />
                <KpiCard label="Inactive" value={buses.length - activeCount} accent="red" />
                <KpiCard label="Vehicle Types" value={new Set(buses.map((b) => b.vehicleType || "Bus")).size} accent="violet" />
            </div>

            {/* Header + Register */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Fleet Roster</h2>
                    <p className="text-sm text-foreground/40">{buses.length} vehicles registered</p>
                </div>
                <button onClick={() => setShowRegisterModal(true)} className="flex items-center gap-2 px-5 py-2.5 cta-gradient text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-shadow">
                    <Plus size={16} /> Add Vehicle
                </button>
            </div>

            {/* Register Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRegisterModal(false)} />
                    <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 z-10">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold">Register Vehicle</h2>
                            <button onClick={() => setShowRegisterModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={(e) => { handleSubmit(e); setShowRegisterModal(false); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input name="name" placeholder="Vehicle Name / Alias" required className="coord-input" />
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input name="busId" placeholder="Hardware Device ID" required className="coord-input flex-1" value={busIdInput} onChange={(e) => { setBusIdInput(e.target.value); setTestStatus("idle"); }} />
                                    <button type="button" onClick={testBusConnection} disabled={!busIdInput || testStatus === "testing"} className="px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 font-medium rounded-xl border border-gray-200 dark:border-zinc-700 text-sm disabled:opacity-50 min-w-[90px] flex justify-center items-center">
                                        {testStatus === "testing" ? <Loader2 size={16} className="animate-spin" /> : "Probe GPS"}
                                    </button>
                                </div>
                                {testStatus === "success" && <p className="text-xs text-emerald-500 font-medium flex items-center gap-1"><CheckCircle size={12} /> Active on GPS</p>}
                                {testStatus === "not_found" && <p className="text-xs text-amber-500 font-medium flex items-center gap-1"><XCircle size={12} /> No signal yet</p>}
                                {testStatus === "error" && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><XCircle size={12} /> Connection error</p>}
                            </div>
                            <input name="licensePlate" placeholder="License Plate (Optional)" className="coord-input" />
                            <select name="vehicleType" className="coord-input">{VEHICLE_TYPES.map((vt) => <option key={vt} value={vt}>{vt}</option>)}</select>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground/40 pl-1">Color</label>
                                <div className="flex flex-wrap gap-2">
                                    <input type="hidden" name="color" id="color-input" defaultValue="#3b82f6" />
                                    {FLEET_COLORS.map((fc) => (
                                        <button key={fc.value} type="button" title={fc.label} onClick={(e) => { const input = e.currentTarget.closest("form")?.querySelector("#color-input") as HTMLInputElement; if (input) input.value = fc.value; e.currentTarget.closest(".flex")?.querySelectorAll("button").forEach((b) => b.classList.remove("ring-2", "ring-offset-2", "ring-foreground")); e.currentTarget.classList.add("ring-2", "ring-offset-2", "ring-foreground"); }} className={`w-7 h-7 rounded-full border-2 border-white shadow-sm transition-all hover:scale-110 ${fc.value === "#3b82f6" ? "ring-2 ring-offset-2 ring-foreground" : ""}`} style={{ backgroundColor: fc.value }} />
                                    ))}
                                </div>
                            </div>
                            <input name="capacity" type="number" placeholder="Capacity (Seats)" className="coord-input" />
                            <input name="expectedMileage" type="number" step="0.1" placeholder="Mileage (km/L)" className="coord-input" />
                            <input name="fuelTankCapacity" type="number" placeholder="Tank Capacity (L)" className="coord-input" />
                            <select name="preferredFuelType" className="coord-input"><option value="diesel">Diesel</option><option value="petrol">Petrol</option><option value="cng">CNG</option><option value="octane">Octane</option></select>
                            <input name="currentOdometerReading" type="number" placeholder="Odometer (km)" className="coord-input" />
                            <input name="maintenanceInterval" type="number" placeholder="Maintenance Interval (km)" defaultValue="5000" className="coord-input" />
                            <textarea name="notes" placeholder="Notes (Optional)" className="coord-input md:col-span-2" rows={2} />
                            <button disabled={loading} className="w-full cta-gradient text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 md:col-span-2">
                                <Plus size={16} /> Register Vehicle
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bus List */}
            {buses.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
                    <BusIcon size={40} className="mx-auto text-foreground/10 mb-3" />
                    <p className="text-foreground/40 font-medium">No vehicles registered yet</p>
                    <p className="text-foreground/25 text-sm mt-1">Click "Add Vehicle" to get started</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {buses.map((bus) => (
                        <div key={bus._id}>
                            {editingBus?._id === bus._id ? (
                                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5">
                                    <EditBusForm bus={editingBus} onSave={handleUpdate} onCancel={() => setEditingBus(null)} loading={loading} />
                                </div>
                            ) : (
                                <BusCard bus={bus} onEdit={() => setEditingBus(bus)} onAddFuel={() => setShowFuelForm(bus._id)} onDelete={() => handleDelete(bus._id)} />
                            )}
                            {showFuelForm === bus._id && (
                                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 -mt-1">
                                    <FuelForm busName={bus.name} preferredFuelType={bus.preferredFuelType} fuelFormData={fuelFormData} setFuelFormData={setFuelFormData} onSubmit={() => handleAddFuel(bus._id)} onCancel={() => setShowFuelForm(null)} loading={loading} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
