"use client";

import React, { useState, useEffect } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { Search, Filter, ScrollText, User, Clock } from "lucide-react";

interface AuditEntry {
    _id: string;
    action: string;
    resource: string;
    resourceName?: string;
    details?: string;
    performedBy?: { name: string; email: string; role: string };
    createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
    CREATE: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    UPDATE: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    DELETE: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    LOGIN: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    ASSIGN: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    SETTING_CHANGE: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
    STATUS_CHANGE: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400",
};

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [search, setSearch] = useState("");
    const [resourceFilter, setResourceFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [stats, setStats] = useState({ totalLogs: 0, todayLogs: 0, weekLogs: 0 });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchLogs = async () => {
        try {
            const params = new URLSearchParams({ page: String(page), limit: "30" });
            if (search) params.set("search", search);
            if (resourceFilter) params.set("resource", resourceFilter);
            if (actionFilter) params.set("action", actionFilter);
            const res = await fetch(`${API_URL}/audit-logs?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.data?.data || []);
                setTotalPages(data.data?.pagination?.totalPages || 1);
            }
        } catch (err) { console.error(err); }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/audit-logs/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (res.ok) {
                const data = await res.json();
                setStats(data.data || { totalLogs: 0, todayLogs: 0, weekLogs: 0 });
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchLogs(); }, [page, resourceFilter, actionFilter]);
    useEffect(() => { fetchStats(); }, []);

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchLogs(); };

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-violet-200/50 dark:border-violet-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Logs</p><p className="text-2xl font-bold">{stats.totalLogs}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Today</p><p className="text-2xl font-bold">{stats.todayLogs}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">This Week</p><p className="text-2xl font-bold">{stats.weekLogs}</p></div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="coord-input pl-9" />
                </form>
                <select value={resourceFilter} onChange={e => { setResourceFilter(e.target.value); setPage(1); }} className="coord-input w-auto min-w-[140px]">
                    <option value="">All Resources</option>
                    {["Bus", "Crew", "Route", "User", "Announcement", "Pickup", "Fuel", "Settings"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} className="coord-input w-auto min-w-[130px]">
                    <option value="">All Actions</option>
                    {["CREATE", "UPDATE", "DELETE", "LOGIN", "ASSIGN", "SETTING_CHANGE", "STATUS_CHANGE"].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            {/* Log Entries */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-50 dark:divide-zinc-800/50">
                {logs.length === 0 && (
                    <div className="py-16 text-center">
                        <ScrollText size={32} className="mx-auto text-foreground/10 mb-2" />
                        <p className="text-foreground/30 text-sm">No audit logs found</p>
                        <p className="text-foreground/20 text-xs mt-1">Logs will appear as actions are performed</p>
                    </div>
                )}
                {logs.map(log => (
                    <div key={log._id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                            <User size={14} className="text-foreground/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{log.performedBy?.name || "System"}</span>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>{log.action}</span>
                                <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-foreground/40 px-1.5 py-0.5 rounded-md font-semibold">{log.resource}</span>
                            </div>
                            {log.details && <p className="text-sm text-foreground/50 mt-0.5">{log.details}</p>}
                            {log.resourceName && <p className="text-xs text-foreground/30 mt-0.5">Resource: {log.resourceName}</p>}
                        </div>
                        <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 text-xs text-foreground/30"><Clock size={10} />{timeAgo(log.createdAt)}</div>
                            <p className="text-[10px] text-foreground/20 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-xl text-sm font-medium disabled:opacity-30">Previous</button>
                    <span className="text-sm text-foreground/40">Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-xl text-sm font-medium disabled:opacity-30">Next</button>
                </div>
            )}
        </div>
    );
}
