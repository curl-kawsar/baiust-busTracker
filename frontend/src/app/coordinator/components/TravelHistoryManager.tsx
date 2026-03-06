"use client";

import React, { useState } from "react";
import { TravelHistory, Bus } from "../types";
import { Filter, Printer } from "lucide-react";
import { generateTravelHistoryPrint } from "@/lib/printUtils";

export default function TravelHistoryManager({ travelHistory, buses, refresh }: { travelHistory: TravelHistory[]; buses: Bus[]; refresh: () => void }) {
    const [selectedBusId, setSelectedBusId] = useState<string>("");
    const filteredHistory = selectedBusId ? travelHistory.filter((trip) => trip.busId?._id === selectedBusId) : travelHistory;

    const handlePrint = () => {
        const printContent = generateTravelHistoryPrint(filteredHistory as any, selectedBusId, buses as any);
        const printWindow = window.open("", "_blank");
        if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); printWindow.print(); }
    };

    const completedTrips = filteredHistory.filter((t) => t.status === "completed").length;
    const inProgressTrips = filteredHistory.filter((t) => t.status === "in-progress").length;
    const totalDist = filteredHistory.reduce((sum, trip) => sum + trip.distance, 0);
    const totalPassengers = filteredHistory.reduce((sum, trip) => sum + trip.passengers, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Travel History</h2>
                    <p className="text-sm text-foreground/40">{selectedBusId ? `${filteredHistory.length} trips` : `${travelHistory.length} total trips`}</p>
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
                <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Completed</p><p className="text-2xl font-bold">{completedTrips}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">In Progress</p><p className="text-2xl font-bold">{inProgressTrips}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Distance</p><p className="text-2xl font-bold">{totalDist} km</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-violet-200/50 dark:border-violet-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Passengers</p><p className="text-2xl font-bold">{totalPassengers}</p></div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-zinc-800">
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Bus</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Route</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Departure</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Distance</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Passengers</th>
                                <th className="px-5 py-3.5 text-left text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.map((trip) => (
                                <tr key={trip._id} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-5 py-3.5 text-sm font-medium">{trip.busId?.name || "N/A"}</td>
                                    <td className="px-5 py-3.5 text-sm text-foreground/60">{trip.routeId?.name || "N/A"}</td>
                                    <td className="px-5 py-3.5 text-sm text-foreground/60">
                                        <div>{new Date(trip.departureTime).toLocaleDateString()}</div>
                                        <div className="text-xs text-foreground/30">{new Date(trip.departureTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}</div>
                                    </td>
                                    <td className="px-5 py-3.5 text-sm font-medium">{trip.distance} km</td>
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
    );
}
