"use client";

import React, { useState } from "react";
import { Crew, Bus } from "../types";
import { API_URL, getToken } from "@/lib/auth";
import { Plus, Trash2, Users, Edit2, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function CrewManager({ crews, buses, refresh }: { crews: Crew[]; buses: Bus[]; refresh: () => void }) {
    const [loading, setLoading] = useState(false);
    const [busIdInput, setBusIdInput] = useState("");
    const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error" | "not_found">("idle");
    const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
    const [editForm, setEditForm] = useState({ name: "", role: "Driver", phone: "", busId: "", pictureUrl: "" });

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
        const data = Object.fromEntries(formData.entries());
        try {
            await fetch(`${API_URL}/crews`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(data) });
            form.reset(); setBusIdInput(""); setTestStatus("idle"); refresh();
        } finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        await fetch(`${API_URL}/crews/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
        refresh();
    };

    const startEdit = (c: Crew) => {
        setEditingCrew(c);
        setEditForm({ name: c.name, role: c.role, phone: c.phone, busId: c.busId || "", pictureUrl: c.pictureUrl || "" });
    };

    const handleUpdateCrew = async () => {
        if (!editingCrew) return;
        setLoading(true);
        try {
            await fetch(`${API_URL}/crews/${editingCrew._id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(editForm) });
            setEditingCrew(null); refresh();
        } finally { setLoading(false); }
    };

    const driverCount = crews.filter((c) => c.role === "Driver").length;
    const supervisorCount = crews.filter((c) => c.role === "Supervisor").length;

    return (
        <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Crew</p><p className="text-2xl font-bold">{crews.length}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Drivers</p><p className="text-2xl font-bold">{driverCount}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-violet-200/50 dark:border-violet-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Supervisors</p><p className="text-2xl font-bold">{supervisorCount}</p></div>
                </div>
            </div>

            <div className="grid md:grid-cols-[1fr_1fr] gap-8">
                {/* Add Form */}
                <div>
                    <h2 className="text-lg font-bold mb-4">Add Crew Member</h2>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input name="name" placeholder="Full Name" required className="coord-input" />
                        <select name="role" required className="coord-input">
                            <option value="Driver">Driver</option>
                            <option value="Supervisor">Supervisor</option>
                        </select>
                        <input name="phone" placeholder="Phone Number" required className="coord-input" />
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <select name="busId" required className="coord-input flex-1" value={busIdInput} onChange={(e) => { setBusIdInput(e.target.value); setTestStatus("idle"); }}>
                                    <option value="">Select Bus</option>
                                    {buses.map((b) => <option key={b._id} value={b.busId}>{b.name} ({b.busId})</option>)}
                                </select>
                                <button type="button" onClick={testBusConnection} disabled={!busIdInput || testStatus === "testing"} className="px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 font-medium rounded-xl border border-gray-200 dark:border-zinc-700 text-sm disabled:opacity-50 min-w-[90px] flex justify-center items-center">
                                    {testStatus === "testing" ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
                                </button>
                            </div>
                            {testStatus === "success" && <p className="text-xs text-emerald-500 font-medium flex items-center gap-1"><CheckCircle size={12} /> Active on GPS</p>}
                            {testStatus === "not_found" && <p className="text-xs text-amber-500 font-medium flex items-center gap-1"><XCircle size={12} /> No signal</p>}
                            {testStatus === "error" && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><XCircle size={12} /> Error</p>}
                        </div>
                        <input name="pictureUrl" placeholder="Picture URL (optional)" className="coord-input" />
                        <button disabled={loading} className="w-full cta-gradient text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                            <Plus size={16} /> Add Member
                        </button>
                    </form>
                </div>

                {/* Roster */}
                <div>
                    <h2 className="text-lg font-bold mb-4">Current Roster</h2>
                    <div className="grid gap-3">
                        {crews.length === 0 && <p className="text-foreground/40 text-sm">No crew members yet.</p>}
                        {crews.map((c) => (
                            <div key={c._id} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 group">
                                {editingCrew?._id === c._id ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-semibold text-sm">Edit Member</h4>
                                            <button onClick={() => setEditingCrew(null)} className="text-xs text-foreground/40 hover:text-foreground">Cancel</button>
                                        </div>
                                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Full Name" className="coord-input" />
                                        <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="coord-input">
                                            <option value="Driver">Driver</option><option value="Supervisor">Supervisor</option>
                                        </select>
                                        <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone" className="coord-input" />
                                        <select value={editForm.busId} onChange={(e) => setEditForm({ ...editForm, busId: e.target.value })} className="coord-input">
                                            <option value="">No Bus</option>
                                            {buses.map((b) => <option key={b._id} value={b.busId}>{b.name} ({b.busId})</option>)}
                                        </select>
                                        <input value={editForm.pictureUrl} onChange={(e) => setEditForm({ ...editForm, pictureUrl: e.target.value })} placeholder="Picture URL" className="coord-input" />
                                        <button onClick={handleUpdateCrew} disabled={loading || !editForm.name || !editForm.phone} className="w-full py-2.5 cta-gradient text-white rounded-xl font-semibold text-sm disabled:opacity-50">{loading ? "Saving..." : "Save"}</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                                {c.pictureUrl ? <img src={c.pictureUrl} alt={c.name} className="w-full h-full object-cover" /> : <Users size={16} className="text-foreground/30" />}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-sm">{c.name}</h3>
                                                <div className="flex gap-2 text-xs text-foreground/50 mt-0.5">
                                                    <span className={`px-1.5 py-0.5 rounded-md font-medium ${c.role === "Driver" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" : "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"}`}>{c.role}</span>
                                                    <span>{c.phone}</span>
                                                    {c.busId && <span className="font-mono text-primary">#{c.busId}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEdit(c)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(c._id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
