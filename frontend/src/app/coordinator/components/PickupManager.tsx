"use client";

import React, { useState } from "react";
import { Pickup, Schedule } from "../types";
import { API_URL, getToken } from "@/lib/auth";
import { Plus, Trash2, MapPin, Edit2, CheckCircle, RotateCcw } from "lucide-react";
import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "@/components/ThemeProvider";
import { getMapProvider, getMapboxToken, getMapStyle } from "@/lib/mapConfig";
import { GMapComponent, GMarker } from "@/components/GoogleMapComponents";

export default function PickupManager({ pickups, refresh }: { pickups: Pickup[]; refresh: () => void }) {
    const [loading, setLoading] = useState(false);
    const provider = getMapProvider();
    const { theme } = useTheme();
    const [markerPos, setMarkerPos] = useState({ lat: 23.4724, lng: 91.139 });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "" });

    const mapStyle = getMapStyle(theme as "light" | "dark");
    const mapboxToken = getMapboxToken();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const payload = { name: formData.name, description: formData.description, lat: markerPos.lat, lng: markerPos.lng };
        try {
            const url = editingId ? `${API_URL}/pickups/${editingId}` : `${API_URL}/pickups`;
            await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(payload) });
            handleResetForm(); refresh();
        } finally { setLoading(false); }
    };

    const handleResetForm = () => { setEditingId(null); setFormData({ name: "", description: "" }); setMarkerPos({ lat: 23.4724, lng: 91.139 }); };

    const handleDelete = async (id: string) => {
        await fetch(`${API_URL}/pickups/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
        refresh();
    };

    const handleAddSchedule = async (id: string, existingSchedules: Schedule[] | undefined) => {
        const time = prompt("Enter Time (e.g. 07:30 AM):");
        if (!time) return;
        const busId = prompt("Enter Bus ID (e.g. bus01):");
        if (!busId) return;
        const newSchedules = [...(existingSchedules || []), { time, busIds: [busId] }];
        await fetch(`${API_URL}/pickups/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ schedules: newSchedules }) });
        refresh();
    };

    const selectForEdit = (p: Pickup) => {
        setEditingId(p._id);
        setFormData({ name: p.name, description: p.description || "" });
        setMarkerPos({ lat: p.lat, lng: p.lng });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Points</p><p className="text-2xl font-bold">{pickups.length}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">With Schedules</p><p className="text-2xl font-bold">{pickups.filter((p) => p.schedules && p.schedules.length > 0).length}</p></div>
                </div>
            </div>

            <div className="grid md:grid-cols-[1fr_1fr] gap-8">
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        {editingId ? <><Edit2 className="text-primary" size={18} /> Edit Point</> : <><Plus className="text-primary" size={18} /> Add Pickup Point</>}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input name="name" placeholder="Location Name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="coord-input" />
                        <input name="description" placeholder="Details (Optional)" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="coord-input" />
                        <div className="w-full h-56 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 relative">
                            <p className="absolute top-2 left-2 z-10 bg-white/80 dark:bg-zinc-900/80 px-2 py-1 text-[10px] rounded-lg shadow backdrop-blur-sm font-medium">Click to set pin</p>
                            {(provider === "google" || mapboxToken) ? (
                                (() => {
                                    const MK = provider === "google" ? GMarker : Marker;
                                    const children = (
                                        <MK longitude={markerPos.lng} latitude={markerPos.lat} anchor="bottom">
                                            <MapPin size={28} className="text-primary drop-shadow-md" />
                                        </MK>
                                    );
                                    return provider === "google" ? (
                                        <GMapComponent initialViewState={{ longitude: markerPos.lng, latitude: markerPos.lat, zoom: 13 }} onClick={(e: any) => setMarkerPos({ lat: e.lngLat.lat, lng: e.lngLat.lng })} style={{ width: "100%", height: "100%" }}>
                                            {children}
                                        </GMapComponent>
                                    ) : (
                                        <Map initialViewState={{ longitude: markerPos.lng, latitude: markerPos.lat, zoom: 13 }} mapStyle={mapStyle} mapboxAccessToken={mapboxToken} style={{ width: "100%", height: "100%" }} onClick={(e) => setMarkerPos({ lat: e.lngLat.lat, lng: e.lngLat.lng })}>
                                            {children}
                                        </Map>
                                    );
                                })()
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-zinc-800 text-foreground/30 text-sm">Map Token Missing</div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button disabled={loading} className="flex-1 cta-gradient text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm">
                                <CheckCircle size={14} /> {editingId ? "Update" : "Add Point"}
                            </button>
                            {editingId && (
                                <button type="button" onClick={handleResetForm} className="px-4 bg-gray-100 dark:bg-zinc-800 py-2.5 rounded-xl font-medium flex items-center gap-2 text-sm">
                                    <RotateCcw size={14} /> Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="flex flex-col max-h-[700px]">
                    <h2 className="text-lg font-bold mb-4">
                        Registered Points <span className="text-xs font-normal text-foreground/30">({pickups.length})</span>
                    </h2>
                    <div className="grid gap-3 overflow-y-auto pr-2 no-scrollbar">
                        {pickups.length === 0 && <p className="text-foreground/40 text-sm">No pickup points added yet.</p>}
                        {pickups.map((p) => (
                            <div key={p._id} className="flex flex-col gap-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 group">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-sm">{p.name}</h3>
                                        <div className="text-[10px] text-foreground/30 font-mono">{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => selectForEdit(p)} className={`p-2 rounded-lg transition-colors border ${editingId === p._id ? "bg-primary text-white border-primary" : "text-primary hover:bg-primary/10 border-primary/20"}`}><Edit2 size={14} /></button>
                                        <button onClick={() => handleAddSchedule(p._id, p.schedules)} className="p-2 text-primary hover:bg-primary/10 rounded-lg border border-primary/20"><Plus size={14} /></button>
                                        <button onClick={() => handleDelete(p._id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-red-200/50 dark:border-red-800/30"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                {p.schedules && p.schedules.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                        {p.schedules.map((s, idx) => (
                                            <div key={idx} className="text-[10px] bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded-lg flex items-center gap-1 border border-gray-100 dark:border-zinc-700">
                                                <span className="font-medium">{s.time}</span>
                                                <span className="text-foreground/20">|</span>
                                                {s.busIds?.map((bid) => <span key={bid} className="font-mono text-primary font-semibold">#{bid}</span>)}
                                            </div>
                                        ))}
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
