"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Route, Pickup, Bus, ClientWaypoint } from "../types";
import { API_URL, getToken } from "@/lib/auth";
import {
    Plus, Trash2, Loader2, Edit2, RotateCcw,
    GitMerge as RouteIcon, Navigation, Flag, Hand, XCircle,
} from "lucide-react";
import Map, { Marker, Source, Layer, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "@/components/ThemeProvider";
import { getMapProvider, getMapboxToken, getMapStyle, fetchDirections as fetchDirectionsAPI } from "@/lib/mapConfig";
import { GMapComponent, GMarker, GSource, GLayer, GPopup } from "@/components/GoogleMapComponents";

export default function RouteManager({ routes, pickups, buses, refresh }: { routes: Route[]; pickups: Pickup[]; buses: Bus[]; refresh: () => void }) {
    const [loading, setLoading] = useState(false);
    const [waypoints, setWaypoints] = useState<ClientWaypoint[]>([]);
    const [scheduleInputs, setScheduleInputs] = useState<Record<string, { busIds: string[]; departureTime: string }>>({});
    const [startPoint, setStartPoint] = useState<Pickup | null>(null);
    const [endPoint, setEndPoint] = useState<Pickup | null>(null);
    const [selectionMode, setSelectionMode] = useState<"start" | "end" | "waypoint">("start");
    const [mapZoom, setMapZoom] = useState(12);
    const [namingPopup, setNamingPopup] = useState<{ lat: number; lng: number; type: "start" | "end" | "waypoint" } | null>(null);
    const [plannedGeometry, setPlannedGeometry] = useState<any>(null);

    const provider = getMapProvider();
    const mapboxToken = getMapboxToken();
    const { theme } = useTheme();
    const mapStyle = getMapStyle(theme as "light" | "dark");

    useEffect(() => {
        const fetchPlannedRoute = async () => {
            if (!startPoint || !endPoint) { setPlannedGeometry(null); return; }
            const points = [
                { lat: startPoint.lat, lng: startPoint.lng },
                ...waypoints.map((w) => { const p = pickups.find((pk) => pk._id === w.pickupPointId); return p ? { lat: p.lat, lng: p.lng } : null; }).filter((p) => p !== null),
                { lat: endPoint.lat, lng: endPoint.lng },
            ] as { lat: number; lng: number }[];
            if (points.length < 2) return;
            try {
                const result = await fetchDirectionsAPI(points, "driving");
                if (result) { setPlannedGeometry(result.geometry); }
            } catch (err) { console.error("Failed to fetch route geometry", err); }
        };
        fetchPlannedRoute();
    }, [startPoint, endPoint, waypoints, pickups]);

    const routeGeoJSON = useMemo(() => {
        if (!plannedGeometry) {
            if (!startPoint && waypoints.length === 0 && !endPoint) return null;
            const coords: number[][] = [];
            if (startPoint) coords.push([startPoint.lng, startPoint.lat]);
            waypoints.forEach((w) => { const p = pickups.find((pk) => pk._id === w.pickupPointId); if (p) coords.push([p.lng, p.lat]); });
            if (endPoint) coords.push([endPoint.lng, endPoint.lat]);
            if (coords.length < 2) return null;
            return { type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: coords }, properties: {} };
        }
        return { type: "Feature" as const, geometry: plannedGeometry, properties: {} };
    }, [startPoint, endPoint, waypoints, pickups, plannedGeometry]);

    const onMapClick = useCallback((e: { lngLat: { lng: number; lat: number } }) => {
        setNamingPopup({ lat: e.lngLat.lat, lng: e.lngLat.lng, type: selectionMode });
    }, [selectionMode]);

    const handleSetPoint = async (name: string) => {
        if (!namingPopup) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/pickups`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ name, lat: namingPopup.lat, lng: namingPopup.lng, description: "Via Route Planner" }) });
            if (res.ok) {
                const newPickup = await res.json();
                const pickupData = newPickup.point || newPickup;
                await refresh();
                if (namingPopup.type === "start") { setStartPoint(pickupData); setSelectionMode("waypoint"); }
                else if (namingPopup.type === "end") { setEndPoint(pickupData); }
                else { addWaypoint(pickupData); }
            }
        } catch (err) { console.error(err); } finally { setLoading(false); setNamingPopup(null); }
    };

    const addWaypoint = (pickup: Pickup) => {
        if (waypoints.find((w) => w.pickupPointId === pickup._id)) return;
        setWaypoints([...waypoints, { _id: Math.random().toString(36).substr(2, 9), pickupPointId: pickup._id, delayMinutes: 0 }]);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!startPoint || !endPoint) { alert("Set Start and End points"); return; }
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        try {
            const res = await fetch(`${API_URL}/routes`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ name: String(formData.get("name") || ""), startPointId: startPoint._id, endPointId: endPoint._id, waypoints: waypoints.map(({ pickupPointId, delayMinutes }) => ({ pickupPointId, delayMinutes })) }) });
            if (res.ok) { e.currentTarget.reset(); setWaypoints([]); setStartPoint(null); setEndPoint(null); refresh(); }
            else { const err = await res.json(); alert(`Failed: ${err.message || res.statusText}`); }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleReset = () => { setStartPoint(null); setEndPoint(null); setWaypoints([]); setSelectionMode("start"); };
    const handleRename = async (id: string, currentName: string) => { const n = prompt("New name:", currentName); if (!n || n === currentName) return; try { await fetch(`${API_URL}/routes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ name: n }) }); refresh(); } catch { } };
    const handleDelete = async (id: string) => { await fetch(`${API_URL}/routes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } }); refresh(); };

    const handleAddSchedule = async (routeId: string) => {
        const input = scheduleInputs[routeId];
        if (!input || !input.busIds?.length || !input.departureTime) return;
        try { await fetch(`${API_URL}/routes/${routeId}/schedules`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(input) }); setScheduleInputs({ ...scheduleInputs, [routeId]: { busIds: [], departureTime: "" } }); refresh(); } catch { }
    };

    const handleDeleteSchedule = async (schedId: string) => {
        await fetch(`${API_URL}/routes/schedules/${schedId}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
        refresh();
    };

    return (
        <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Routes</p><p className="text-2xl font-bold">{routes.length}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Stops</p><p className="text-2xl font-bold">{routes.reduce((sum, r) => sum + (r.waypoints?.length || 0), 0)}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Schedules</p><p className="text-2xl font-bold">{routes.reduce((sum, r) => sum + (r.schedules?.length || 0), 0)}</p></div>
                </div>
            </div>

            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold flex items-center gap-2"><RouteIcon className="text-primary" size={18} /> Route Planner</h2>
                        <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl border border-gray-200 dark:border-zinc-700">
                            {(["start", "waypoint", "end"] as const).map((m) => (
                                <button key={m} onClick={() => setSelectionMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectionMode === m ? "bg-white dark:bg-zinc-700 shadow-sm text-primary" : "text-foreground/40"}`}>
                                    {m === "start" ? "Set Start" : m === "end" ? "Set End" : "Add Stops"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[420px] w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 relative">
                        {(() => {
                            const MK = provider === "google" ? GMarker : Marker;
                            const SRC = provider === "google" ? GSource : Source;
                            const LY = provider === "google" ? GLayer : Layer;
                            const POP = provider === "google" ? GPopup : Popup;
                            const mapChildren = (
                                <>
                                    {pickups.map((p) => (
                                        <MK key={p._id} longitude={p.lng} latitude={p.lat} anchor="bottom" onClick={(e: any) => { e.originalEvent?.stopPropagation?.(); if (selectionMode === "start") { setStartPoint(p); setSelectionMode("waypoint"); } else if (selectionMode === "end") { setEndPoint(p); } else { addWaypoint(p); } }}>
                                            <button type="button" className="transition-all hover:scale-110">
                                                {mapZoom >= 14 ? (
                                                    <div className="relative"><div className="absolute inset-0 bg-white rounded-full shadow-lg" /><Hand size={20} className={`relative z-10 ${waypoints.find((w) => w.pickupPointId === p._id) ? "text-primary" : "text-blue-600"}`} /></div>
                                                ) : (
                                                    <div className={`w-3 h-3 rounded-full border-2 ${waypoints.find((w) => w.pickupPointId === p._id) ? "bg-primary border-white shadow-primary/50 shadow-lg" : "bg-blue-500 border-blue-300 shadow-blue-500/40 shadow-md"}`} />
                                                )}
                                            </button>
                                        </MK>
                                    ))}
                                    {startPoint && <MK longitude={startPoint.lng} latitude={startPoint.lat} anchor="bottom"><div className="flex flex-col items-center"><div className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 shadow">START</div><Navigation className="text-emerald-500 fill-emerald-500 drop-shadow-md" size={20} /></div></MK>}
                                    {endPoint && <MK longitude={endPoint.lng} latitude={endPoint.lat} anchor="bottom"><div className="flex flex-col items-center"><div className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 shadow">END</div><Flag className="text-red-500 fill-red-500 drop-shadow-md" size={20} /></div></MK>}
                                    {routeGeoJSON && <SRC id="route-line" type="geojson" data={routeGeoJSON}><LY id="route-layer" type="line" paint={{ "line-color": "#4f46e5", "line-width": 4, "line-opacity": 0.8 }} /></SRC>}
                                    {namingPopup && (
                                        <POP longitude={namingPopup.lng} latitude={namingPopup.lat} anchor="bottom" onClose={() => setNamingPopup(null)} closeOnClick={false}>
                                            <div className="p-2 space-y-2 min-w-[150px]">
                                                <p className="text-[10px] font-bold uppercase text-foreground/40">Location Name</p>
                                                <input autoFocus placeholder="e.g. Main Gate" className="w-full text-sm px-2 py-1 bg-background border border-border rounded" onKeyDown={(e) => { if (e.key === "Enter") handleSetPoint(e.currentTarget.value); }} />
                                                <p className="text-[10px] text-foreground/30">Press Enter to set</p>
                                            </div>
                                        </POP>
                                    )}
                                </>
                            );
                            return provider === "google" ? (
                                <GMapComponent initialViewState={{ longitude: 91.139, latitude: 23.4724, zoom: 12 }} onClick={onMapClick} onMove={(evt: any) => setMapZoom(evt.viewState.zoom)} style={{ width: "100%", height: "100%" }}>
                                    {mapChildren}
                                </GMapComponent>
                            ) : (
                                <Map initialViewState={{ longitude: 91.139, latitude: 23.4724, zoom: 12 }} mapStyle={mapStyle} mapboxAccessToken={mapboxToken} onClick={onMapClick} onMove={(evt) => setMapZoom(evt.viewState.zoom)} cursor={selectionMode === "waypoint" ? "crosshair" : "pointer"} style={{ width: "100%", height: "100%" }}>
                                    {mapChildren}
                                </Map>
                            );
                        })()}
                    </div>

                    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 ml-1">Line Name</label>
                                <input name="name" placeholder="e.g. Surma Express" required className="coord-input" />
                            </div>
                            <div className="flex items-end gap-2">
                                <button type="submit" disabled={loading} className="flex-[2] cta-gradient text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                                    {loading ? <><Loader2 className="animate-spin" size={16} /> Creating...</> : <><Plus size={16} /> Create Line</>}
                                </button>
                                <button type="button" onClick={handleReset} className="flex-1 bg-gray-100 dark:bg-zinc-800 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm text-foreground/50"><RotateCcw size={14} /> Reset</button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-foreground/40 flex items-center gap-2"><Navigation size={12} /> Waypoint Sequence</h3>
                            {waypoints.length === 0 && <div className="text-center py-4 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl text-foreground/25 text-xs">Click map pins to add stops</div>}
                            <div className="grid gap-2">
                                {startPoint && (
                                    <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30">
                                        <div className="bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold">S</div>
                                        <div><p className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">{startPoint.name}</p><p className="text-[9px] text-foreground/30 uppercase font-bold">Origin</p></div>
                                    </div>
                                )}
                                {waypoints.map((w, idx) => {
                                    const p = pickups.find((pk) => pk._id === w.pickupPointId);
                                    return (
                                        <div key={w._id} className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl group">
                                            <div className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold">{idx + 1}</div>
                                            <p className="font-semibold text-xs flex-1">{p?.name}</p>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[9px] text-foreground/30 uppercase font-bold">Delay</span>
                                                <input type="number" min="0" value={w.delayMinutes} onChange={(e) => setWaypoints(waypoints.map((item) => item._id === w._id ? { ...item, delayMinutes: parseInt(e.target.value) || 0 } : item))} className="w-12 px-1.5 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded text-[10px] text-center font-bold" />
                                                <span className="text-[9px] text-foreground/30">min</span>
                                            </div>
                                            <button type="button" onClick={() => setWaypoints(waypoints.filter((item) => item._id !== w._id))} className="text-red-400 p-1 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                        </div>
                                    );
                                })}
                                {endPoint && (
                                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200/50 dark:border-red-800/30">
                                        <div className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold">E</div>
                                        <div><p className="font-semibold text-xs text-red-600 dark:text-red-400">{endPoint.name}</p><p className="text-[9px] text-foreground/30 uppercase font-bold">Destination</p></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Active Routes List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Navigation className="text-primary rotate-90" size={18} /> Active Lines</h2>
                    <div className="grid gap-3 overflow-y-auto max-h-[780px] pr-1 no-scrollbar">
                        {routes.length === 0 && (
                            <div className="text-center py-12 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
                                <RouteIcon size={32} className="mx-auto text-foreground/10 mb-2" />
                                <p className="text-foreground/30 text-sm">No lines yet</p>
                            </div>
                        )}
                        {routes.map((r) => (
                            <div key={r._id} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 space-y-4 group">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold">{r.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold">
                                            <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">{r.startPointId?.name || r.startName}</span>
                                            <span className="text-foreground/20">→</span>
                                            <span className="text-red-500 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">{r.endPointId?.name || r.endName}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleRename(r._id, r.name)} className="p-1.5 text-foreground/30 hover:text-primary rounded-lg"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(r._id)} className="p-1.5 text-foreground/30 hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                {/* Waypoints inline */}
                                <div className="flex flex-wrap gap-1">
                                    {r.waypoints?.map((w, idx) => {
                                        const p = typeof w.pickupPointId === "object" ? w.pickupPointId : pickups.find((pk) => pk._id === w.pickupPointId);
                                        return <span key={idx} className="text-[10px] bg-gray-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md font-semibold">{p?.name || "?"}{w.delayMinutes > 0 && <span className="text-foreground/25 ml-1">{w.delayMinutes}m</span>}</span>;
                                    })}
                                </div>

                                {/* Schedules */}
                                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
                                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-foreground/30">Schedules</h4>
                                    {r.schedules && r.schedules.length > 0 && (
                                        <div className="space-y-1.5">
                                            {r.schedules.map((s) => (
                                                <div key={s._id} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 p-2 rounded-lg text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">{s.time || s.departureTime}</span>
                                                        <div className="flex flex-wrap gap-1">{s.busIds?.map((bid) => <span key={bid} className="font-mono text-foreground/40 bg-gray-50 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">#{bid}</span>)}</div>
                                                    </div>
                                                    <button onClick={() => handleDeleteSchedule(s._id)} className="text-red-300 hover:text-red-500 p-1"><XCircle size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-zinc-700">
                                        <div className="flex gap-2">
                                            <input type="time" className="w-28 px-2 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-bold" value={scheduleInputs[r._id]?.departureTime || ""} onChange={(e) => setScheduleInputs({ ...scheduleInputs, [r._id]: { ...scheduleInputs[r._id], departureTime: e.target.value } })} />
                                            <button onClick={() => handleAddSchedule(r._id)} disabled={!scheduleInputs[r._id]?.busIds?.length || !scheduleInputs[r._id]?.departureTime} className="flex-1 py-2 cta-gradient text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-50"><Plus size={12} /> Add Trip</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto p-1 bg-white dark:bg-zinc-900 rounded-lg no-scrollbar border border-gray-100 dark:border-zinc-700">
                                            {buses.map((b) => {
                                                const checked = (scheduleInputs[r._id]?.busIds || []).includes(b.busId);
                                                return (
                                                    <label key={b._id} className={`flex items-center gap-1.5 p-1 rounded cursor-pointer text-[10px] border transition-all ${checked ? "bg-primary/5 border-primary/20 text-primary" : "bg-transparent border-transparent hover:border-gray-200 dark:hover:border-zinc-700"}`}>
                                                        <input type="checkbox" className="w-3 h-3 accent-primary" checked={checked} onChange={(e) => { const ids = scheduleInputs[r._id]?.busIds || []; setScheduleInputs({ ...scheduleInputs, [r._id]: { ...scheduleInputs[r._id], busIds: e.target.checked ? [...ids, b.busId] : ids.filter((id) => id !== b.busId) } }); }} />
                                                        <span className="font-semibold truncate">{b.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
