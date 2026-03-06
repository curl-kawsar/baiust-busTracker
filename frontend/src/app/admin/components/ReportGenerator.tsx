"use client";

import React, { useState, useEffect } from "react";
import { API_URL, getToken } from "@/lib/auth";
import { Printer, FileText, Calendar, Fuel as FuelIcon, Wrench, MapPin } from "lucide-react";

interface Bus { _id: string; name: string; busId: string; }

export default function ReportGenerator() {
    const [reportType, setReportType] = useState<"fuel" | "travel" | "maintenance">("fuel");
    const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
    const [buses, setBuses] = useState<Bus[]>([]);
    const [selectedBus, setSelectedBus] = useState("");
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/buses`, { headers: { Authorization: `Bearer ${getToken()}` } })
            .then(r => r.json()).then(setBuses).catch(console.error);
    }, []);

    const generateReport = async () => {
        setGenerating(true);
        try {
            const headers = { Authorization: `Bearer ${getToken()}` };
            const busName = selectedBus ? buses.find(b => b._id === selectedBus)?.name || "Selected Bus" : "All Buses";
            let reportHtml = "";

            if (reportType === "fuel") {
                const res = await fetch(`${API_URL}/fuel?limit=500`, { headers });
                let records = res.ok ? (await res.json()).data || [] : [];
                records = records.filter((r: any) => {
                    const d = new Date(r.date);
                    return d >= new Date(dateFrom) && d <= new Date(dateTo + "T23:59:59") && (!selectedBus || r.busId?._id === selectedBus);
                });
                const totalCost = records.reduce((s: number, r: any) => s + r.totalCost, 0);
                const totalLiters = records.reduce((s: number, r: any) => s + r.liters, 0);
                reportHtml = buildReport("Fuel Consumption Report", busName, dateFrom, dateTo, [
                    { label: "Records", value: records.length },
                    { label: "Total Cost", value: `৳${totalCost.toLocaleString()}` },
                    { label: "Total Liters", value: `${totalLiters.toLocaleString()}L` },
                    { label: "Avg Cost/L", value: `৳${totalLiters > 0 ? (totalCost / totalLiters).toFixed(2) : 0}` },
                ], ["Bus", "Date", "Type", "Liters", "Cost/L", "Total", "Station"],
                    records.map((r: any) => [r.busId?.name || "N/A", new Date(r.date).toLocaleDateString(), r.fuelType, `${r.liters}L`, `৳${r.costPerLiter}`, `৳${r.totalCost.toLocaleString()}`, r.fuelStation || "—"]));
            }

            if (reportType === "travel") {
                const res = await fetch(`${API_URL}/travel-history?limit=500`, { headers });
                let trips = res.ok ? (await res.json()).data || [] : [];
                trips = trips.filter((t: any) => {
                    const d = new Date(t.departureTime);
                    return d >= new Date(dateFrom) && d <= new Date(dateTo + "T23:59:59") && (!selectedBus || t.busId?._id === selectedBus);
                });
                const totalDist = trips.reduce((s: number, t: any) => s + t.distance, 0);
                const totalPax = trips.reduce((s: number, t: any) => s + t.passengers, 0);
                reportHtml = buildReport("Travel History Report", busName, dateFrom, dateTo, [
                    { label: "Trips", value: trips.length },
                    { label: "Completed", value: trips.filter((t: any) => t.status === "completed").length },
                    { label: "Distance", value: `${totalDist} km` },
                    { label: "Passengers", value: totalPax },
                ], ["Bus", "Route", "Departure", "Distance", "Passengers", "Status"],
                    trips.map((t: any) => [t.busId?.name || "N/A", t.routeId?.name || "N/A", new Date(t.departureTime).toLocaleString(), `${t.distance} km`, t.passengers, t.status]));
            }

            if (reportType === "maintenance") {
                const res = await fetch(`${API_URL}/maintenance?limit=500`, { headers });
                let records = res.ok ? (await res.json()).data || [] : [];
                records = records.filter((r: any) => {
                    const d = new Date(r.scheduledDate);
                    return d >= new Date(dateFrom) && d <= new Date(dateTo + "T23:59:59") && (!selectedBus || r.busId?._id === selectedBus);
                });
                const totalCost = records.reduce((s: number, r: any) => s + r.cost, 0);
                reportHtml = buildReport("Maintenance Report", busName, dateFrom, dateTo, [
                    { label: "Records", value: records.length },
                    { label: "Completed", value: records.filter((r: any) => r.status === "completed").length },
                    { label: "Overdue", value: records.filter((r: any) => r.status === "overdue").length },
                    { label: "Total Cost", value: `৳${totalCost.toLocaleString()}` },
                ], ["Bus", "Type", "Scheduled", "Status", "Cost", "Vendor"],
                    records.map((r: any) => [r.busId?.name || "N/A", r.type.replace(/_/g, " "), new Date(r.scheduledDate).toLocaleDateString(), r.status, `৳${r.cost.toLocaleString()}`, r.vendor || "—"]));
            }

            const win = window.open("", "_blank");
            if (win) { win.document.write(reportHtml); win.document.close(); win.print(); }
        } catch (err) { console.error(err); }
        finally { setGenerating(false); }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold tracking-tight">Report Generator</h2>
                <p className="text-sm text-foreground/40">Generate printable PDF reports for fuel, travel, and maintenance</p>
            </div>

            {/* Report Type Cards */}
            <div className="grid grid-cols-3 gap-4">
                {([
                    { key: "fuel", label: "Fuel Report", icon: FuelIcon, desc: "Fuel consumption, costs, and station data" },
                    { key: "travel", label: "Travel Report", icon: MapPin, desc: "Trip history, distances, and passenger counts" },
                    { key: "maintenance", label: "Maintenance Report", icon: Wrench, desc: "Service records, costs, and schedules" },
                ] as const).map(rt => (
                    <button key={rt.key} onClick={() => setReportType(rt.key)} className={`text-left p-5 rounded-2xl border-2 transition-all ${reportType === rt.key ? "border-primary bg-primary/5" : "border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700"}`}>
                        <rt.icon size={24} className={reportType === rt.key ? "text-primary mb-3" : "text-foreground/20 mb-3"} />
                        <h3 className="font-bold text-sm">{rt.label}</h3>
                        <p className="text-xs text-foreground/40 mt-1">{rt.desc}</p>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6 space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-2"><Calendar size={16} className="text-primary" /> Report Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">From</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="coord-input" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">To</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="coord-input" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Vehicle</label>
                        <select value={selectedBus} onChange={e => setSelectedBus(e.target.value)} className="coord-input">
                            <option value="">All Vehicles</option>
                            {buses.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={generateReport} disabled={generating} className="w-full py-2.5 cta-gradient text-white rounded-xl font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                            <Printer size={16} /> {generating ? "Generating..." : "Generate & Print"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Info */}
            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-8 text-center border border-dashed border-gray-200 dark:border-zinc-700">
                <FileText size={40} className="mx-auto text-foreground/10 mb-3" />
                <p className="text-foreground/40 font-medium">Select report type, date range, then click Generate</p>
                <p className="text-foreground/25 text-sm mt-1">Report will open in a new tab ready for printing</p>
            </div>
        </div>
    );
}

function buildReport(title: string, busName: string, from: string, to: string, stats: { label: string; value: any }[], headers: string[], rows: any[][]): string {
    return `<!DOCTYPE html><html><head><title>${title}</title><style>
    body { font-family: 'Segoe UI', sans-serif; margin: 30px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
    .header h1 { font-size: 22px; margin: 0; } .header h2 { font-size: 14px; color: #666; margin: 5px 0; }
    .header p { font-size: 12px; color: #999; }
    .stats { display: flex; justify-content: space-around; margin: 25px 0; background: #f8f8f8; padding: 20px; border-radius: 8px; }
    .stat { text-align: center; } .stat-value { font-size: 24px; font-weight: bold; color: #4338ca; }
    .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th { background: #f0f0f0; padding: 10px 12px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: #555; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    tr:hover { background: #fafafa; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
    @media print { body { margin: 15px; } .stats { background: #f8f8f8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
    <div class="header"><h1>Loopr: BAIUST Transit</h1><h2>${title} — ${busName}</h2><p>${from} to ${to} · Generated ${new Date().toLocaleString()}</p></div>
    <div class="stats">${stats.map(s => `<div class="stat"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join("")}</div>
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <div class="footer"><p>Loopr: BAIUST Transit Management System — Confidential Report</p></div>
  </body></html>`;
}
