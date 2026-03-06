"use client";

import React, { useState } from "react";
import { FuelRecord, Bus } from "../types";
import { Filter, Printer } from "lucide-react";
import { generateFuelRecordsPrint } from "@/lib/printUtils";

export default function FuelManager({ fuelRecords, buses, refresh }: { fuelRecords: FuelRecord[]; buses: Bus[]; refresh: () => void }) {
    const [selectedBusId, setSelectedBusId] = useState<string>("");
    const filteredRecords = selectedBusId ? fuelRecords.filter((r) => r.busId?._id === selectedBusId) : fuelRecords;

    const totalCost = filteredRecords.reduce((sum, r) => sum + r.totalCost, 0);
    const totalLiters = filteredRecords.reduce((sum, r) => sum + r.liters, 0);
    const thisMonthRecords = filteredRecords.filter((r) => new Date(r.date).getMonth() === new Date().getMonth());

    const handlePrint = () => {
        const printContent = generateFuelRecordsPrint(filteredRecords as any, selectedBusId, buses as any);
        const printWindow = window.open("", "_blank");
        if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); printWindow.print(); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Fuel Management</h2>
                    <p className="text-sm text-foreground/40">{selectedBusId ? `${filteredRecords.length} records` : `${fuelRecords.length} total records`}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-foreground/30" />
                        <select value={selectedBusId} onChange={(e) => setSelectedBusId(e.target.value)} className="coord-input py-2 text-sm min-w-[160px]">
                            <option value="">All Buses</option>
                            {buses.map((bus) => <option key={bus._id} value={bus._id}>{bus.name}</option>)}
                        </select>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 cta-gradient text-white rounded-xl text-sm font-semibold shadow-sm">
                        <Printer size={14} /> Print
                    </button>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-red-200/50 dark:border-red-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Cost</p><p className="text-2xl font-bold">৳{totalCost.toLocaleString()}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Liters</p><p className="text-2xl font-bold">{totalLiters.toLocaleString()}L</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">This Month</p><p className="text-2xl font-bold">{thisMonthRecords.length}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-violet-200/50 dark:border-violet-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Avg Cost/L</p><p className="text-2xl font-bold">৳{totalLiters > 0 ? Math.round((totalCost / totalLiters) * 100) / 100 : 0}</p></div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-zinc-800">
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Bus</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Date</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Type</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Liters</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Cost/L</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Total</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Station</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map((record) => (
                                <tr key={record._id} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-5 py-3.5 text-sm font-medium">{record.busId?.name || "N/A"}</td>
                                    <td className="px-5 py-3.5 text-sm text-foreground/60">
                                        <div>{new Date(record.date).toLocaleDateString()}</div>
                                        <div className="text-xs text-foreground/30">{new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}</div>
                                    </td>
                                    <td className="px-5 py-3.5 text-sm capitalize">{record.fuelType}</td>
                                    <td className="px-5 py-3.5 text-sm font-medium">{record.liters}L</td>
                                    <td className="px-5 py-3.5 text-sm text-foreground/60">৳{record.costPerLiter}</td>
                                    <td className="px-5 py-3.5 text-sm font-semibold">৳{record.totalCost.toLocaleString()}</td>
                                    <td className="px-5 py-3.5 text-sm text-foreground/40">{record.fuelStation || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
