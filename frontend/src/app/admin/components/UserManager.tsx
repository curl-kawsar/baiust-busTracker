"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { Plus, Trash2, Edit2, Users, UserCheck, ShieldCheck, GraduationCap, Briefcase, X, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    institutionId?: string;
    department?: string;
    session?: string;
    isEligible: boolean;
    createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
    Admin: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    Coordinator: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
    Student: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    Staff: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    Faculty: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
    Admin: ShieldCheck, Coordinator: UserCheck, Student: GraduationCap, Staff: Briefcase, Faculty: Briefcase,
};

export default function UserManager() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "Student", isEligible: false, institutionId: "", department: "", session: "" });
    const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});

    const fetchUsers = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(page), limit: "20" });
            if (search) params.set("search", search);
            if (roleFilter) params.set("role", roleFilter);
            const res = await fetch(`${API_URL}/auth/users?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (res.ok) {
                const json = await res.json();
                const d = json?.data || json;
                setUsers(d.users || d.data || []);
                setTotal(d.pagination?.total || 0);
                setTotalPages(d.pagination?.totalPages || 1);
            }
        } catch (err) { console.error(err); }
    }, [page, search, roleFilter]);

    const fetchRoleCounts = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/users/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (res.ok) {
                const json = await res.json();
                setRoleCounts(json?.data?.byRole || json?.byRole || {});
            }
        } catch {
            // stats endpoint may not exist — compute from current page
        }
    };

    useEffect(() => { fetchUsers(); }, [fetchUsers]);
    useEffect(() => { fetchRoleCounts(); }, []);

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchUsers(); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const body: any = { name: formData.name, email: formData.email, role: formData.role, isEligible: formData.isEligible };
            if (formData.password) body.password = formData.password;
            if (formData.institutionId) body.institutionId = formData.institutionId;
            if (formData.department) body.department = formData.department;
            if (formData.session) body.session = formData.session;

            if (editingUser) {
                await fetch(`${API_URL}/auth/users/${editingUser._id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) });
            } else {
                if (!formData.password) { alert("Password is required"); setLoading(false); return; }
                await fetch(`${API_URL}/auth/users`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) });
            }
            resetForm();
            fetchUsers();
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleEdit = (u: User) => {
        setEditingUser(u);
        setFormData({ name: u.name, email: u.email, password: "", role: u.role, isEligible: u.isEligible, institutionId: u.institutionId || "", department: u.department || "", session: u.session || "" });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this user? This cannot be undone.")) return;
        await fetch(`${API_URL}/auth/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
        fetchUsers();
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "Student", isEligible: false, institutionId: "", department: "", session: "" });
    };

    const kpiCards = [
        { label: "Total Users", value: total, color: "indigo" },
        { label: "Students", value: roleCounts["Student"] || 0, color: "blue" },
        { label: "Staff", value: roleCounts["Staff"] || 0, color: "amber" },
        { label: "Faculty", value: roleCounts["Faculty"] || 0, color: "emerald" },
    ];

    return (
        <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpiCards.map(k => (
                    <div key={k.label} className={`relative overflow-hidden rounded-2xl border border-${k.color}-200/50 dark:border-${k.color}-800/30 p-5`}>
                        <div className={`absolute inset-0 bg-gradient-to-br from-${k.color}-50 to-${k.color}-100/50 dark:from-${k.color}-950/40 dark:to-${k.color}-900/20`} />
                        <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">{k.label}</p><p className="text-2xl font-bold">{k.value}</p></div>
                    </div>
                ))}
            </div>

            {/* Header + Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">All Users</h2>
                    <p className="text-sm text-foreground/40">{total} users total</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-5 py-2.5 cta-gradient text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-shadow">
                    <Plus size={16} /> New User
                </button>
            </div>

            <div className="flex flex-wrap gap-3">
                <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="coord-input pl-9" />
                </form>
                <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="coord-input w-auto min-w-[130px]">
                    <option value="">All Roles</option>
                    {["Admin", "Coordinator", "Student", "Staff", "Faculty"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={resetForm} />
                    <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-2xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold">{editingUser ? "Edit User" : "Create User"}</h3>
                            <button onClick={resetForm} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 col-span-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Full Name</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="coord-input" placeholder="Full Name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Email</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="coord-input" placeholder="user@baiust.edu.bd" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">{editingUser ? "New Password (optional)" : "Password"}</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="coord-input" placeholder="••••••••" {...(!editingUser && { required: true })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Role</label>
                                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="coord-input">
                                    {["Student", "Staff", "Faculty", "Coordinator", "Admin"].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Eligible</label>
                                <select value={formData.isEligible ? "true" : "false"} onChange={e => setFormData({ ...formData, isEligible: e.target.value === "true" })} className="coord-input">
                                    <option value="false">No (IUMSS verification needed)</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>
                            {(formData.role === "Student" || formData.role === "Staff" || formData.role === "Faculty") && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Institution ID</label>
                                        <input value={formData.institutionId} onChange={e => setFormData({ ...formData, institutionId: e.target.value })} className="coord-input" placeholder="e.g. CSE-2021-001" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Department</label>
                                        <input value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="coord-input" placeholder="e.g. CSE" />
                                    </div>
                                    {formData.role === "Student" && (
                                        <div className="space-y-1.5 col-span-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Session</label>
                                            <input value={formData.session} onChange={e => setFormData({ ...formData, session: e.target.value })} className="coord-input" placeholder="e.g. 2021-2022" />
                                        </div>
                                    )}
                                </>
                            )}
                            <button type="submit" disabled={loading} className="col-span-2 py-3 cta-gradient text-white rounded-xl font-semibold flex items-center justify-center gap-2 mt-2">
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                {editingUser ? "Update User" : "Create User"}
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
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">User</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Email</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Role</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Joined</th>
                                <th className="px-5 py-3.5 text-right text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 && (
                                <tr><td colSpan={6} className="px-5 py-12 text-center text-foreground/30">
                                    <Users size={32} className="mx-auto mb-2 text-foreground/10" />
                                    <p className="text-sm">No users found</p>
                                </td></tr>
                            )}
                            {users.map(u => {
                                const RoleIcon = ROLE_ICONS[u.role] || Users;
                                return (
                                    <tr key={u._id} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-foreground/50">{u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
                                                <div>
                                                    <p className="font-medium text-sm">{u.name}</p>
                                                    {u.institutionId && <p className="text-[10px] text-foreground/30 font-mono">{u.institutionId}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-foreground/60">{u.email}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"}`}>
                                                <RoleIcon size={10} /> {u.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${u.isEligible ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                                                {u.isEligible ? "Eligible" : "Not Eligible"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-foreground/40">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(u)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg" title="Edit"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDelete(u._id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg" title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-xl text-sm font-medium disabled:opacity-30 transition-opacity"><ChevronLeft size={14} /> Prev</button>
                    <span className="text-sm text-foreground/40 font-medium">Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-xl text-sm font-medium disabled:opacity-30 transition-opacity">Next <ChevronRight size={14} /></button>
                </div>
            )}
        </div>
    );
}
