"use client";

import React, { useState, useEffect } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { Plus, Trash2, Edit2, Users, Shield, X, Loader2 } from "lucide-react";

interface Coordinator {
    _id: string;
    name: string;
    email: string;
    role: string;
    isEligible: boolean;
    createdAt: string;
}

export default function CoordinatorManager() {
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "", email: "", password: "" });

    const fetchCoordinators = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/users?role=Coordinator&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (res.ok) {
                const json = await res.json();
                // API returns { success, data: { users: [...], pagination: {...} } }
                const d = json?.data || json;
                const list = d.users || d.data || [];
                setCoordinators(Array.isArray(list) ? list : []);
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchCoordinators(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await fetch(`${API_URL}/auth/users/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ name: formData.name, email: formData.email, ...(formData.password ? { password: formData.password } : {}) }) });
            } else {
                await fetch(`${API_URL}/auth/users`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ ...formData, role: "Coordinator", isEligible: true }) });
            }
            setFormData({ name: "", email: "", password: "" });
            setShowForm(false);
            setEditingId(null);
            fetchCoordinators();
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleEdit = (c: Coordinator) => {
        setEditingId(c._id);
        setFormData({ name: c.name, email: c.email, password: "" });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this coordinator?")) return;
        await fetch(`${API_URL}/auth/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
        fetchCoordinators();
    };

    return (
        <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Coordinators</p><p className="text-2xl font-bold">{coordinators.length}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Active</p><p className="text-2xl font-bold">{coordinators.filter(c => c.isEligible).length}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">This Month</p><p className="text-2xl font-bold">{coordinators.filter(c => new Date(c.createdAt).getMonth() === new Date().getMonth()).length}</p></div>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Transport Coordinators</h2>
                    <p className="text-sm text-foreground/40">{coordinators.length} coordinators registered</p>
                </div>
                <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: "", email: "", password: "" }); }} className="flex items-center gap-2 px-5 py-2.5 cta-gradient text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-shadow">
                    <Plus size={16} /> Add Coordinator
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-2xl w-full max-w-md p-6 z-10">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold">{editingId ? "Edit" : "Add"} Coordinator</h3>
                            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">Full Name</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="coord-input" placeholder="e.g. Md. Rahim Uddin" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">Email</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="coord-input" placeholder="e.g. coord@baiust.edu.bd" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">{editingId ? "New Password (leave blank to keep)" : "Password"}</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="coord-input" placeholder="••••••••" {...(!editingId && { required: true })} />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 cta-gradient text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                {editingId ? "Update Coordinator" : "Create Coordinator"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-zinc-800">
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Name</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Email</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Created</th>
                                <th className="px-5 py-3.5 text-right text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coordinators.length === 0 && (
                                <tr><td colSpan={5} className="px-5 py-12 text-center text-foreground/30">
                                    <Shield size={32} className="mx-auto mb-2 text-foreground/10" />
                                    <p className="text-sm">No coordinators yet</p>
                                </td></tr>
                            )}
                            {coordinators.map(c => (
                                <tr key={c._id} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">{c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
                                            <span className="font-medium text-sm">{c.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-sm text-foreground/60">{c.email}</td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${c.isEligible ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"}`}>
                                            {c.isEligible ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-foreground/40">{new Date(c.createdAt).toLocaleDateString()}</td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(c)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(c._id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
