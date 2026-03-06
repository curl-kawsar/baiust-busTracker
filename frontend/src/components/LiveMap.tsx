import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "./ThemeProvider";
import { useLiveTracking, BusLocation } from "@/hooks/useLiveTracking";
import { API_URL, getToken } from "@/lib/auth";
import { getMapProvider, getMapboxToken, getMapStyle, fetchDirections as fetchDirectionsAPI } from "@/lib/mapConfig";
import { GMapComponent, GMarker, GSource, GLayer, type GoogleMapRef } from "./GoogleMapComponents";
import {
  GitMerge,
  ChevronRight,
  Hand,
  X,
  ArrowLeft,
  MapPin,
  Clock,
  Navigation,
  Bus as BusIcon,
  Car,
  Bike,
  Ambulance,
  Truck,
  Gauge,
  ChevronUp,
  ChevronDown,
  Phone,
  User as UserIcon,
  Locate,
  Footprints,
} from "lucide-react";
import { getUser } from "@/lib/auth";

export type VehicleType = "Bus" | "Microbus" | "Car" | "Bike" | "Ambulance" | "Pickup" | "Truck" | "Other";

const VEHICLE_ICON: Record<VehicleType, React.ComponentType<any>> = {
  Bus: BusIcon,
  Microbus: BusIcon,
  Car: Car,
  Bike: Bike,
  Ambulance: Ambulance,
  Pickup: Truck,
  Truck: Truck,
  Other: BusIcon,
};

// Fleet marker icon with per-vehicle type support
const FleetMarkerIcon = ({ color, label, vehicleType = "Bus" }: { color: string; label?: string; vehicleType?: VehicleType }) => {
  const Icon = VEHICLE_ICON[vehicleType] || BusIcon;
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-10 h-10 rounded-xl shadow-lg border-2 flex items-center justify-center"
        style={{ backgroundColor: color, borderColor: "white" }}
      >
        <Icon size={20} className="text-white" />
        {label && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-foreground bg-white/90 dark:bg-black/70 px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-sm">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

// A placeholder coordinates for BAIUST/Comilla Region
const INITIAL_VIEW_STATE = {
  longitude: 91.139,
  latitude: 23.4724,
  zoom: 13,
};

export const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

interface PickupPoint {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  schedules?: { _id: string; time: string; busId: string }[];
}

interface RouteSchedule {
  _id: string;
  busIds: string[];
  departureTime: string;
}

export interface TransportRoute {
  _id: string;
  name: string;
  startPointId: PickupPoint;
  endPointId: PickupPoint;
  startName?: string;
  startLat?: number;
  startLng?: number;
  endName?: string;
  endLat?: number;
  endLng?: number;
  waypoints: { pickupPointId: string | PickupPoint; delayMinutes: number }[];
  schedules?: RouteSchedule[];
}

const calculateTimeWithOffset = (baseTime: string, offsetMinutes: number) => {
  if (!baseTime) return "";
  let hours = 0;
  let minutes = 0;
  if (baseTime.includes("AM") || baseTime.includes("PM")) {
    const parts = baseTime.split(" ");
    const timeStr = parts[0];
    const period = parts[1].toUpperCase();
    const timeParts = timeStr.split(":").map(Number);
    hours = timeParts[0];
    minutes = timeParts[1] || 0;
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  } else {
    const parts = baseTime.split(":");
    hours = Number(parts[0]);
    minutes = Number(parts[1] || 0);
  }
  const totalMinutes = hours * 60 + minutes + offsetMinutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  const dispPeriod = newHours >= 12 ? "PM" : "AM";
  const dispHours = newHours % 12 || 12;
  return `${dispHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")} ${dispPeriod}`;
};

/** Haversine distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

interface CrewMember {
  _id: string;
  name: string;
  role: "Driver" | "Supervisor";
  phone: string;
  busId?: string;
  pictureUrl?: string;
}

/** Check if a schedule time string like "07:32 AM" has already passed today */
function isTimePassed(timeStr: string): boolean {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return false;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  const now = new Date();
  const scheduleMinutes = hours * 60 + mins;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return scheduleMinutes < currentMinutes;
}

function getGreeting(name?: string): string {
  const h = new Date().getHours();
  const firstName = name?.split(" ")[0] || "there";
  if (h < 12) return `Good Morning, ${firstName} \u{1F44B}`;
  if (h < 17) return `Good Afternoon, ${firstName} \u{2600}\u{FE0F}`;
  return `Good Evening, ${firstName} \u{1F319}`;
}

type BottomSheetView = "idle" | "pickup" | "bus" | "me" | "crew";

interface LiveMapProps {
  routes: TransportRoute[];
  selectedRouteIds: string[];
  onToggleRoute: (id: string) => void;
}

export function LiveMap({ routes, selectedRouteIds, onToggleRoute }: LiveMapProps) {
  const provider = getMapProvider();
  const mapboxToken = getMapboxToken();
  const { theme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const googleMapRef = useRef<GoogleMapRef>(null);
  const mapStyle = getMapStyle(theme, provider);

  // Unified map helpers
  const flyTo = useCallback((center: [number, number], zoom?: number) => {
    if (provider === "google") {
      googleMapRef.current?.flyTo({ center, zoom, duration: 800 });
    } else {
      mapRef.current?.flyTo({ center, zoom: zoom || 14, duration: 800 });
    }
  }, [provider]);

  const fitBounds = useCallback((sw: [number, number], ne: [number, number], padding?: any) => {
    if (provider === "google") {
      googleMapRef.current?.fitBounds([sw, ne], { padding });
    } else {
      mapRef.current?.fitBounds([sw, ne], { duration: 800, padding });
    }
  }, [provider]);

  const [activeBusIds, setActiveBusIds] = useState<string[]>([]);
  const locations = useLiveTracking(activeBusIds);

  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<PickupPoint | null>(null);
  const [selectedBus, setSelectedBus] = useState<BusLocation | null>(null);
  const [mapZoom, setMapZoom] = useState(13);

  const [routeGeometries, setRouteGeometries] = useState<Record<string, any>>({});

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [buses, setBuses] = useState<{ _id: string; busId: string; name: string; vehicleType?: VehicleType; color?: string }[]>([]);
  const [showMe, setShowMe] = useState(false);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [directionGeometry, setDirectionGeometry] = useState<any>(null);
  const [directionLoading, setDirectionLoading] = useState(false);
  const currentUser = useMemo(() => getUser(), []);

  const sheetView: BottomSheetView = showMe ? "me" : selectedCrew ? "crew" : selectedPoint ? "pickup" : selectedBus ? "bus" : "idle";

  // Get user's location
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        // Fallback to BAIUST area
        setUserLocation({ lat: 23.4724, lng: 91.139 });
      },
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const fetchCoreAssets = async () => {
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };

        const pRes = await fetch(`${API_URL}/pickups`, { headers });
        if (pRes.ok) setPickupPoints(await pRes.json());

        const bRes = await fetch(`${API_URL}/buses`, { headers });
        if (bRes.ok) {
          const busesData = await bRes.json();
          setBuses(busesData);
          const validBusIds = busesData.map((b: any) => b.busId?.trim()).filter(Boolean);
          setActiveBusIds(validBusIds);
        }

        const cRes = await fetch(`${API_URL}/crews`, { headers });
        if (cRes.ok) setCrewMembers(await cRes.json());
      } catch (err) {
        console.error("Failed to fetch map assets", err);
      }
    };

    fetchCoreAssets();
  }, []);

  useEffect(() => {
    const fetchGeoms = async () => {
      const newGeoms = { ...routeGeometries };
      let changed = false;

      for (const routeId of selectedRouteIds) {
        if (!newGeoms[routeId]) {
          const route = routes.find((r) => r._id === routeId);
          if (!route) continue;

          const wps = (route.waypoints || [])
            .map((w) => {
              const p =
                typeof w.pickupPointId === "object" && w.pickupPointId !== null
                  ? w.pickupPointId
                  : pickupPoints.find((pk) => pk._id === w.pickupPointId);

              return p ? { lat: p.lat, lng: p.lng } : null;
            })
            .filter((p): p is { lat: number; lng: number } => p !== null);

          const points = [
            {
              lat: route.startPointId?.lat ?? route.startLat,
              lng: route.startPointId?.lng ?? route.startLng,
            },
            ...wps,
            {
              lat: route.endPointId?.lat ?? route.endLat,
              lng: route.endPointId?.lng ?? route.endLng,
            },
          ];

          try {
            const result = await fetchDirectionsAPI(points, "driving");
            if (result?.geometry) {
              newGeoms[routeId] = result.geometry;
              changed = true;
            }
          } catch (e) {
            console.error("Failed to fetch geometry for route", routeId, e);
          }
        }
      }

      if (changed) setRouteGeometries(newGeoms);
    };

    if (selectedRouteIds.length > 0 && routes.length > 0 && pickupPoints.length > 0) {
      fetchGeoms();
    }
  }, [selectedRouteIds, routes, pickupPoints, routeGeometries]);

  const handleMeSelect = useCallback(() => {
    setSelectedPoint(null);
    setSelectedBus(null);
    setSelectedCrew(null);
    setShowMe(true);
    setSheetExpanded(true);
    if (userLocation) {
      flyTo([userLocation.lng, userLocation.lat], Math.max(mapZoom, 15));
    }
  }, [userLocation, mapZoom, flyTo]);

  const handlePickupSelect = useCallback(
    (p: PickupPoint) => {
      setSelectedBus(null);
      setSelectedPoint(p);
      setSelectedCrew(null);
      setShowMe(false);
      setSheetExpanded(true);
      flyTo([p.lng, p.lat], Math.max(mapZoom, 14));
    },
    [mapZoom, flyTo],
  );

  const handleBusSelect = useCallback(
    (bus: BusLocation) => {
      setSelectedPoint(null);
      setSelectedBus(bus);
      setSelectedCrew(null);
      setShowMe(false);
      setSheetExpanded(true);
      flyTo([bus.lng, bus.lat], Math.max(mapZoom, 14));
    },
    [mapZoom, flyTo],
  );

  const handleBack = useCallback(() => {
    // If viewing a crew profile, go back to the bus view
    if (selectedCrew && selectedBus) {
      setSelectedCrew(null);
      return;
    }
    setSelectedPoint(null);
    setSelectedBus(null);
    setSelectedCrew(null);
    setShowMe(false);
    setSheetExpanded(false);
    setDirectionGeometry(null);
  }, [selectedCrew, selectedBus]);

  const fetchDirectionsHandler = useCallback(async () => {
    if (!userLocation || !selectedPoint) return;
    setDirectionLoading(true);
    try {
      const result = await fetchDirectionsAPI(
        [{ lat: userLocation.lat, lng: userLocation.lng }, { lat: selectedPoint.lat, lng: selectedPoint.lng }],
        "walking",
      );
      if (result?.geometry) {
        setDirectionGeometry(result.geometry);
        const allCoords = result.geometry.coordinates as [number, number][];
        const lngs = allCoords.map((c) => c[0]);
        const lats = allCoords.map((c) => c[1]);
        fitBounds(
          [Math.min(...lngs) - 0.002, Math.min(...lats) - 0.002],
          [Math.max(...lngs) + 0.002, Math.max(...lats) + 0.002],
          { top: 60, bottom: 260, left: 40, right: 40 },
        );
      }
    } catch (e) {
      console.error("Failed to fetch walking directions", e);
    } finally {
      setDirectionLoading(false);
    }
  }, [userLocation, selectedPoint, fitBounds]);

  const handleRecenter = useCallback(() => {
    if (!userLocation) return;
    flyTo([userLocation.lng, userLocation.lat], 15);
  }, [userLocation, flyTo]);

  // Nearby items sorted by distance
  const nearbyPickups = useMemo(() => {
    if (!userLocation) return pickupPoints.slice(0, 5);
    return [...pickupPoints]
      .map((p) => ({
        ...p,
        distance: haversineKm(userLocation.lat, userLocation.lng, p.lat, p.lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [pickupPoints, userLocation]);

  const nearbyBuses = useMemo(() => {
    const busArr = Object.values(locations) as BusLocation[];
    if (!userLocation) return busArr.slice(0, 3);
    return [...busArr]
      .map((b) => ({
        ...b,
        distance: haversineKm(userLocation.lat, userLocation.lng, b.lat, b.lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [locations, userLocation]);

  // Build unified schedule for a selected pickup
  const pickupSchedules = useMemo(() => {
    if (!selectedPoint) return [];

    const relatedRoutes = routes.filter((route) => {
      const isStart = route.startPointId?._id === selectedPoint._id;
      const isEnd = route.endPointId?._id === selectedPoint._id;
      const isWaypoint = route.waypoints?.some((w) => {
        const pid = typeof w.pickupPointId === "string" ? w.pickupPointId : (w.pickupPointId as PickupPoint)?._id;
        return pid === selectedPoint._id;
      });
      return isStart || isEnd || isWaypoint;
    });

    const manualSchedules = (selectedPoint.schedules || []).map((s) => ({
      time: calculateTimeWithOffset(s.time, 0),
      busId: s.busId,
      lineName: "Direct Service",
      type: "pickup" as const,
    }));

    const routeSchedules = relatedRoutes.flatMap((route) =>
      (route.schedules || []).flatMap((rs) => {
        let offset = 0;
        let type: "start" | "pickup" | "destination" = "pickup";
        if (route.startPointId?._id === selectedPoint._id) {
          offset = 0;
          type = "start";
        } else {
          const wp = route.waypoints?.find((w) => {
            const pid = typeof w.pickupPointId === "string" ? w.pickupPointId : (w.pickupPointId as PickupPoint)?._id;
            return pid === selectedPoint._id;
          });
          if (wp) {
            offset = wp.delayMinutes;
            type = "pickup";
          } else if (route.endPointId?._id === selectedPoint._id) {
            offset = Math.max(...(route.waypoints || []).map((w) => w.delayMinutes), 0) + 5;
            type = "destination";
          } else {
            return [];
          }
        }

        const actualTime = calculateTimeWithOffset(rs.departureTime, offset);
        return (rs.busIds || []).map((bid: string) => ({
          time: actualTime,
          busId: bid,
          lineName: route.name,
          type,
        }));
      }),
    );

    return [...manualSchedules, ...routeSchedules].sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedPoint, routes]);

  // Get bus info (routes it belongs to)
  const busRouteInfo = useMemo(() => {
    if (!selectedBus) return [];
    return routes.filter((r) => r.schedules?.some((s) => (s.busIds || []).includes(selectedBus.id)));
  }, [selectedBus, routes]);

  // Get crew for selected bus
  const busCrew = useMemo(() => {
    if (!selectedBus) return [];
    return crewMembers.filter((c) => c.busId?.toLowerCase() === selectedBus.id.toLowerCase());
  }, [selectedBus, crewMembers]);

  if (provider === "mapbox" && (!mapboxToken || mapboxToken === "YOUR_MAPBOX_TOKEN")) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-accent text-accent-foreground p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Mapbox Token Required</h2>
        <p className="max-w-md">
          Please add your Mapbox Public Access Token to the <code>.env</code> file in the frontend directory.
          <br />
          <br />
          <code>NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here</code>
        </p>
      </div>
    );
  }

  if (provider === "google" && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-accent text-accent-foreground p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Google Maps API Key Required</h2>
        <p className="max-w-md">
          Please add your Google Maps API Key to the <code>.env</code> file in the frontend directory.
          <br />
          <br />
          <code>NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key_here</code>
          <br />
          <code>NEXT_PUBLIC_MAP_PROVIDER=google</code>
        </p>
      </div>
    );
  }

  // ─── Shared marker content renderers ──────────────────────────────────
  const pickupMarkerContent = useCallback((p: PickupPoint) => (
    mapZoom >= 14 ? (
      <div
        className={`relative group cursor-pointer transition-all duration-200 hover:scale-110 drop-shadow-md ${
          selectedPoint?._id === p._id ? "text-primary scale-125 z-20" : "text-blue-600 hover:text-blue-500"
        }`}
      >
        <div className="relative">
          <div
            className={`absolute inset-0 rounded-full shadow-lg scale-125 ${
              selectedPoint?._id === p._id ? "bg-primary/20 ring-2 ring-primary" : "bg-white"
            }`}
          ></div>
          <Hand size={24} className="relative z-10" />
        </div>
        {selectedPoint?._id === p._id && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-primary bg-white/90 dark:bg-black/70 px-2 py-0.5 rounded-md whitespace-nowrap shadow-sm">
            Selected
          </span>
        )}
      </div>
    ) : (
      <div className="relative cursor-pointer transition-all duration-200 hover:scale-110">
        <div
          className={`w-3 h-3 rounded-full border-2 ${
            selectedPoint?._id === p._id ? "bg-primary border-primary w-4 h-4" : "bg-blue-500 border-blue-300"
          }`}
          style={{
            boxShadow:
              selectedPoint?._id === p._id
                ? "0 0 20px rgba(99, 102, 241, 0.7)"
                : "0 0 15px rgba(59, 130, 246, 0.5), 0 0 4px rgba(59, 130, 246, 0.7)",
          }}
        ></div>
      </div>
    )
  ), [mapZoom, selectedPoint]);

  const busMarkerContent = useCallback((bus: any) => {
    const busMeta = buses.find((b) => b.busId === bus.id);
    const color = busMeta?.color || "#3b82f6";
    const vehicleType: VehicleType = (busMeta?.vehicleType as VehicleType) || "Bus";
    const isSelected = selectedBus?.id === bus.id;
    return (
      <div
        className={`relative group cursor-pointer transition-all duration-200 ${
          isSelected ? "scale-125 z-20" : "hover:scale-110"
        }`}
      >
        {isSelected && (
          <div
            className="absolute -inset-3 rounded-2xl border-2 pointer-events-none"
            style={{ borderColor: color, boxShadow: `0 0 16px ${color}40` }}
          />
        )}
        <FleetMarkerIcon color={color} label={isSelected ? undefined : bus.id.toUpperCase()} vehicleType={vehicleType} />
        {bus.speed > 0 && (
          <div
            style={{ backgroundColor: color }}
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background animate-pulse shadow-sm"
          />
        )}
      </div>
    );
  }, [buses, selectedBus]);

  const userMarkerContent = useMemo(() => (
    <div
      className={`relative flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 ${
        showMe ? "scale-110" : ""
      }`}
    >
      <div className="absolute w-11 h-11 rounded-full bg-primary/15" />
      {showMe && <div className="absolute w-11 h-11 rounded-full bg-primary/30 animate-ping" />}
      {showMe && <div className="absolute w-14 h-14 rounded-full border-2 border-primary/40 pointer-events-none" />}
      <div
        className={`relative w-9 h-9 rounded-full bg-white shadow-lg border-2 flex items-center justify-center z-10 transition-colors ${
          showMe ? "border-primary" : "border-primary/70"
        }`}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className="text-primary">
          <circle cx="12" cy="7" r="4" fill="currentColor" />
          <path
            d="M12 13c-4.42 0-8 1.79-8 4v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1c0-2.21-3.58-4-8-4z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  ), [showMe]);

  // ─── Map Rendering (provider-aware) ──────────────────────────────────
  const renderMapContent = () => {
    const MK = provider === "google" ? GMarker : Marker;
    const SRC = provider === "google" ? GSource : Source;
    const LY = provider === "google" ? GLayer : Layer;

    return (
      <>
        {selectedRouteIds.map((rid) => {
          const geom = routeGeometries[rid];
          if (!geom) return null;
          const routeIndex = routes.findIndex((r) => r._id === rid);
          const color = COLORS[routeIndex % COLORS.length];
          return (
            <SRC key={rid} id={`route-${rid}`} type="geojson" data={{ type: "Feature", geometry: geom, properties: {} }}>
              <LY id={`layer-${rid}`} type="line" paint={{ "line-color": color, "line-width": 6, "line-opacity": 0.8 }} layout={{ "line-join": "round", "line-cap": "round" }} />
            </SRC>
          );
        })}

        {pickupPoints.map((p) => (
          <MK key={p._id} longitude={p.lng} latitude={p.lat} anchor="bottom" onClick={(e) => { e.originalEvent.stopPropagation(); handlePickupSelect(p); }}>
            {pickupMarkerContent(p)}
          </MK>
        ))}

        {Object.values(locations).map((bus: any) => (
          <MK key={bus.id} longitude={bus.lng} latitude={bus.lat} anchor="center" onClick={(e) => { e.originalEvent.stopPropagation(); handleBusSelect(bus); }}>
            {busMarkerContent(bus)}
          </MK>
        ))}

        {directionGeometry && (
          <SRC id="walking-direction" type="geojson" data={{ type: "Feature", geometry: directionGeometry, properties: {} }}>
            <LY id="walking-direction-casing" type="line" paint={{ "line-color": "#6366f1", "line-width": 8, "line-opacity": 0.2 }} layout={{ "line-join": "round", "line-cap": "round" }} />
            <LY id="walking-direction-line" type="line" paint={{ "line-color": "#6366f1", "line-width": 4, "line-opacity": 0.9, "line-dasharray": [0, 2] }} layout={{ "line-join": "round", "line-cap": "round" }} />
          </SRC>
        )}

        {userLocation && (
          <MK longitude={userLocation.lng} latitude={userLocation.lat} anchor="center" onClick={(e) => { e.originalEvent.stopPropagation(); handleMeSelect(); }}>
            {userMarkerContent}
          </MK>
        )}
      </>
    );
  };

  return (
    <div className="w-full h-full relative">
      {provider === "google" ? (
        <GMapComponent
          ref={googleMapRef}
          initialViewState={INITIAL_VIEW_STATE}
          onMove={(evt) => setMapZoom(evt.viewState.zoom)}
          style={{ width: "100%", height: "100%" }}
        >
          {renderMapContent()}
        </GMapComponent>
      ) : (
        <Map
          ref={mapRef}
          initialViewState={INITIAL_VIEW_STATE}
          mapStyle={mapStyle}
          mapboxAccessToken={mapboxToken}
          onMove={(evt) => setMapZoom(evt.viewState.zoom)}
          style={{ width: "100%", height: "100%" }}
        >
          {renderMapContent()}
        </Map>
      )}

      {/* ───── BOTTOM SHEET ───── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 flex justify-center px-4 transition-all duration-500 ease-out ${
          sheetExpanded ? "max-h-[50vh]" : "max-h-52"
        }`}
      >
        <div className="w-full max-w-5xl flex flex-col">
          {/* Gradient fade above sheet */}
          <div className="h-8 bg-linear-to-t from-background/60 to-transparent pointer-events-none" />

          <div className="glass-panel rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col pointer-events-auto">
            {/* Drag Handle */}
            <button
              onClick={() => setSheetExpanded(!sheetExpanded)}
              className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            >
              <div className="w-10 h-1 rounded-full bg-foreground/20" />
            </button>

            {/* Sheet Header */}
            <div className="px-5 pb-3 flex items-center gap-3">
              {sheetView !== "idle" && (
                <button onClick={handleBack} className="p-2 -ml-2 rounded-xl hover:bg-accent/50 transition-colors">
                  <ArrowLeft size={20} className="text-foreground/70" />
                </button>
              )}
              <div className="flex-1 min-w-0">
                {sheetView === "idle" && (
                  <>
                    <h2 className="font-bold text-lg tracking-tight bg-linear-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
                      Nearby
                    </h2>
                    <p className="text-sm text-foreground/50 font-medium">Closest pickup points &amp; buses from you</p>
                  </>
                )}
                {sheetView === "pickup" && selectedPoint && (
                  <>
                    <h2 className="font-bold text-lg tracking-tight text-foreground truncate">{selectedPoint.name}</h2>
                    {selectedPoint.description ? (
                      <p className="text-sm text-foreground/50 font-medium truncate">{selectedPoint.description}</p>
                    ) : (
                      <p className="text-sm text-foreground/50 font-medium">Pickup Point</p>
                    )}
                  </>
                )}
                {sheetView === "bus" && selectedBus && (
                  <>
                    <h2 className="font-bold text-lg tracking-tight text-foreground">
                      {buses.find((b) => b.busId === selectedBus.id)?.name || selectedBus.id}
                    </h2>
                    <p className="text-sm text-foreground/50 font-medium">
                      {selectedBus.id.toUpperCase()} &middot;{" "}
                      {selectedBus.speed ? `${Math.round(selectedBus.speed)} KM/H` : "Stationary"}
                    </p>
                  </>
                )}
                {sheetView === "crew" && selectedCrew && (
                  <>
                    <h2 className="font-bold text-lg tracking-tight text-foreground truncate">{selectedCrew.name}</h2>
                    <p className="text-sm text-foreground/50 font-medium">{selectedCrew.role}</p>
                  </>
                )}
                {sheetView === "me" && (
                  <>
                    <h2 className="font-bold text-lg tracking-tight bg-linear-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
                      {getGreeting(currentUser?.name)}
                    </h2>
                    <p className="text-sm text-foreground/50 font-medium">{currentUser?.email || ""}</p>
                  </>
                )}
              </div>

              <button
                onClick={() => setSheetExpanded(!sheetExpanded)}
                className="p-2 rounded-xl hover:bg-accent/50 transition-colors"
              >
                {sheetExpanded ? (
                  <ChevronDown size={20} className="text-foreground/50" />
                ) : (
                  <ChevronUp size={20} className="text-foreground/50" />
                )}
              </button>
            </div>

            {/* Sheet Content */}
            <div
              className={`overflow-y-auto overscroll-contain px-5 pb-6 transition-all duration-500 ${
                sheetExpanded ? "max-h-[40vh]" : "max-h-28"
              }`}
            >
              {/* === IDLE: Nearby Pickups & Buses === */}
              {sheetView === "idle" && (
                <div className="space-y-4">
                  {/* Nearby Pickup Points */}
                  {nearbyPickups.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 flex items-center gap-1.5">
                        <MapPin size={12} /> Pickup Points
                      </h3>
                      <div className="space-y-1.5">
                        {nearbyPickups.map((p: any) => (
                          <button
                            key={p._id}
                            onClick={() => handlePickupSelect(p)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-accent/50 transition-all text-left group active:scale-[0.98]"
                          >
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                              <Hand size={16} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base text-foreground truncate">{p.name}</p>
                              {p.schedules && p.schedules.length > 0 && (
                                <p className="text-xs text-foreground/40 font-medium">
                                  {p.schedules.length} schedule
                                  {p.schedules.length !== 1 ? "s" : ""}
                                </p>
                              )}
                            </div>
                            {p.distance !== undefined && (
                              <span className="text-sm font-mono text-foreground/40 shrink-0">
                                {formatDistance(p.distance)}
                              </span>
                            )}
                            <ChevronRight
                              size={16}
                              className="text-foreground/20 group-hover:text-foreground/50 transition-colors shrink-0"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nearby Buses */}
                  {nearbyBuses.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 flex items-center gap-1.5">
                        <BusIcon size={12} /> Active Buses
                      </h3>
                      <div className="space-y-1.5">
                        {nearbyBuses.map((b: any) => (
                          <button
                            key={b.id}
                            onClick={() => handleBusSelect(b)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-accent/50 transition-all text-left group active:scale-[0.98]"
                          >
                            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                              <BusIcon size={16} className="text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base text-foreground">
                                {buses.find((bus) => bus.busId === b.id)?.name || b.id}
                              </p>
                              <p className="text-xs text-foreground/40 font-medium">
                                {b.speed ? `${Math.round(b.speed)} KM/H` : "Stationary"}
                              </p>
                            </div>
                            {b.distance !== undefined && (
                              <span className="text-sm font-mono text-foreground/40 shrink-0">
                                {formatDistance(b.distance)}
                              </span>
                            )}
                            <ChevronRight
                              size={16}
                              className="text-foreground/20 group-hover:text-foreground/50 transition-colors shrink-0"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {nearbyPickups.length === 0 && nearbyBuses.length === 0 && (
                    <p className="text-sm text-foreground/40 italic text-center py-4">Loading nearby locations...</p>
                  )}
                </div>
              )}

              {/* === PICKUP POINT DETAIL === */}
              {sheetView === "pickup" && selectedPoint && (
                <div className="space-y-4">
                  {/* Distance badge + Directions */}
                  {userLocation && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-semibold">
                        <Navigation size={12} />
                        {formatDistance(
                          haversineKm(userLocation.lat, userLocation.lng, selectedPoint.lat, selectedPoint.lng),
                        )}{" "}
                        away
                      </div>
                      {!directionGeometry ? (
                        <button
                          onClick={fetchDirectionsHandler}
                          disabled={directionLoading}
                          className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                        >
                          <Footprints size={14} />
                          {directionLoading ? "Loading..." : "Directions"}
                        </button>
                      ) : (
                        <button
                          onClick={() => setDirectionGeometry(null)}
                          className="flex items-center gap-1.5 bg-red-500/10 text-red-600 px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:bg-red-500/20 active:scale-95"
                        >
                          <X size={14} />
                          Clear Route
                        </button>
                      )}
                    </div>
                  )}

                  {/* Schedules */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-3 flex items-center gap-1.5">
                      <Clock size={12} /> Schedule &amp; Boarding
                    </h3>

                    {pickupSchedules.length === 0 ? (
                      <p className="text-sm text-foreground/40 italic">No schedules set for this location.</p>
                    ) : (
                      <div className="space-y-2">
                        {pickupSchedules.map((s, idx) => {
                          const passed = isTimePassed(s.time);
                          const busColor = buses.find((b) => b.busId === s.busId)?.color || "#3b82f6";
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-3 bg-accent/30 border border-accent p-3 rounded-2xl transition-all ${passed ? "opacity-40" : "hover:bg-accent/50"}`}
                            >
                              {/* Time */}
                              <div className="shrink-0 text-center min-w-18">
                                <span
                                  className={`font-bold text-base tabular-nums ${passed ? "line-through text-foreground/50" : "text-foreground"}`}
                                >
                                  {s.time}
                                </span>
                                {passed && <p className="text-[10px] text-foreground/40 font-medium">Passed</p>}
                              </div>

                              {/* Divider */}
                              <div className="w-px h-8 bg-border shrink-0" />

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span
                                    className={`text-[11px] font-bold uppercase px-1.5 py-0.5 rounded leading-none ${
                                      s.type === "start"
                                        ? "bg-green-500/10 text-green-600"
                                        : s.type === "pickup"
                                          ? "bg-blue-500/10 text-blue-600"
                                          : "bg-red-500/10 text-red-600"
                                    }`}
                                  >
                                    {s.type}
                                  </span>
                                  <span className="text-xs text-foreground/40 font-medium truncate">{s.lineName}</span>
                                </div>
                              </div>

                              {/* Bus badge */}
                              <span
                                className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold shadow-sm ring-1 shrink-0"
                                style={{ backgroundColor: `${busColor}15`, color: busColor, boxShadow: `inset 0 0 0 1px ${busColor}30` }}
                              >
                                {s.busId?.toUpperCase() || "BUS"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === BUS DETAIL === */}
              {sheetView === "bus" && selectedBus && (
                <div className="space-y-4">
                  {/* Status Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-accent/30 border border-accent rounded-2xl p-3 text-center">
                      <Gauge size={18} className="text-primary mx-auto mb-1.5" />
                      <p className="text-lg font-bold text-foreground tabular-nums">
                        {selectedBus.speed ? `${Math.round(selectedBus.speed)}` : "0"}
                      </p>
                      <p className="text-xs text-foreground/40 font-medium uppercase tracking-wider">KM/H</p>
                    </div>
                    <div className="bg-accent/30 border border-accent rounded-2xl p-3 text-center">
                      <Navigation size={18} className="text-primary mx-auto mb-1.5" />
                      <p className="text-lg font-bold text-foreground tabular-nums">
                        {userLocation
                          ? formatDistance(haversineKm(userLocation.lat, userLocation.lng, selectedBus.lat, selectedBus.lng))
                          : "—"}
                      </p>
                      <p className="text-xs text-foreground/40 font-medium uppercase tracking-wider">Away</p>
                    </div>
                  </div>

                  {/* Routes this bus serves */}
                  {busRouteInfo.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 flex items-center gap-1.5">
                        <GitMerge size={12} /> Assigned Routes
                      </h3>
                      <div className="space-y-2">
                        {busRouteInfo.map((r, idx) => {
                          const color = COLORS[routes.indexOf(r) % COLORS.length];
                          const schedule = r.schedules?.find((s) => (s.busIds || []).includes(selectedBus.id));
                          return (
                            <div
                              key={r._id}
                              className="flex items-center gap-3 bg-accent/30 border border-accent p-3 rounded-2xl"
                            >
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base text-foreground truncate">{r.name}</p>
                                <p className="text-xs text-foreground/40 truncate">
                                  {r.startPointId?.name || r.startName} → {r.endPointId?.name || r.endName}
                                </p>
                              </div>
                              {schedule && (
                                <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
                                  {calculateTimeWithOffset(schedule.departureTime, 0)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {busRouteInfo.length === 0 && (
                    <p className="text-sm text-foreground/40 italic text-center py-2">No route assignments found.</p>
                  )}

                  {/* Crew assigned to this bus */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 flex items-center gap-1.5">
                      <UserIcon size={12} /> Crew
                    </h3>
                    {busCrew.length > 0 ? (
                      <div className="space-y-2">
                        {busCrew.map((c) => (
                          <div
                            key={c._id}
                            className="flex items-center gap-3 bg-accent/30 border border-accent p-3 rounded-2xl cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => { setSelectedCrew(c); setSheetExpanded(true); }}
                          >
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                              {c.pictureUrl ? (
                                <img src={c.pictureUrl} alt={c.name} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                <UserIcon size={18} className="text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base text-foreground truncate">{c.name}</p>
                              <p className="text-xs text-foreground/40">{c.role}</p>
                            </div>
                            {c.phone && (
                              <a
                                href={`tel:${c.phone}`}
                                className="p-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 transition-colors shrink-0"
                              >
                                <Phone size={16} className="text-green-600" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/40 italic text-center py-2">No crew assigned to this vehicle.</p>
                    )}
                  </div>
                </div>
              )}

              {/* === CREW PROFILE === */}
              {sheetView === "crew" && selectedCrew && (
                <div className="space-y-4">
                  {/* Profile Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-primary/20">
                      {selectedCrew.pictureUrl ? (
                        <img src={selectedCrew.pictureUrl} alt={selectedCrew.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <UserIcon size={28} className="text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg text-foreground">{selectedCrew.name}</p>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                        {selectedCrew.role}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    {selectedCrew.phone && (
                      <div className="flex items-center gap-3 bg-accent/30 border border-accent p-3 rounded-2xl">
                        <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                          <Phone size={16} className="text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground/40 font-medium">Phone</p>
                          <p className="font-semibold text-sm text-foreground">{selectedCrew.phone}</p>
                        </div>
                        <a
                          href={`tel:${selectedCrew.phone}`}
                          className="px-3 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 transition-colors text-green-600 text-xs font-semibold"
                        >
                          Call
                        </a>
                      </div>
                    )}

                    {selectedCrew.busId && (
                      <div className="flex items-center gap-3 bg-accent/30 border border-accent p-3 rounded-2xl">
                        <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <BusIcon size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground/40 font-medium">Assigned Vehicle</p>
                          <p className="font-semibold text-sm text-foreground">
                            {buses.find((b) => b.busId === selectedCrew.busId)?.name || selectedCrew.busId}
                          </p>
                        </div>
                        <span className="text-xs text-foreground/40 font-mono">{selectedCrew.busId.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  {/* Back to bus */}
                  {selectedBus && (
                    <button
                      onClick={() => setSelectedCrew(null)}
                      className="w-full py-2.5 rounded-xl bg-accent/50 hover:bg-accent text-sm font-medium text-foreground/60 hover:text-foreground transition-colors flex items-center justify-center gap-2"
                    >
                      <ChevronDown size={14} className="rotate-90" /> Back to {buses.find((b) => b.busId === selectedBus.id)?.name || selectedBus.id}
                    </button>
                  )}
                </div>
              )}

              {/* === MY PROFILE === */}
              {sheetView === "me" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" className="text-primary">
                        <circle cx="12" cy="7" r="4" fill="currentColor" />
                        <path
                          d="M12 13c-4.42 0-8 1.79-8 4v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1c0-2.21-3.58-4-8-4z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg text-foreground">{currentUser?.name || "Traveller"}</p>
                      <p className="text-sm text-foreground/50">{currentUser?.email || ""}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {currentUser?.department && (
                      <div className="bg-accent/30 border border-accent rounded-2xl p-3 text-center">
                        <p className="text-xs text-foreground/40 uppercase tracking-wider mb-1">Dept</p>
                        <p className="font-semibold text-base text-foreground">{currentUser.department}</p>
                      </div>
                    )}
                    {currentUser?.institutionId && (
                      <div className="bg-accent/30 border border-accent rounded-2xl p-3 text-center">
                        <p className="text-xs text-foreground/40 uppercase tracking-wider mb-1">ID</p>
                        <p className="font-semibold text-sm text-foreground font-mono">{currentUser.institutionId}</p>
                      </div>
                    )}
                    {currentUser?.session && (
                      <div className="bg-accent/30 border border-accent rounded-2xl p-3 text-center">
                        <p className="text-xs text-foreground/40 uppercase tracking-wider mb-1">Session</p>
                        <p className="font-semibold text-sm text-foreground">{currentUser.session}</p>
                      </div>
                    )}
                  </div>

                  {userLocation && (
                    <div className="bg-accent/30 border border-accent rounded-2xl p-3">
                      <div className="flex items-center gap-2 text-xs text-foreground/40 mb-1">
                        <MapPin size={12} /> Your coordinates
                      </div>
                      <p className="font-mono text-sm text-foreground">
                        {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recenter Button */}
      {userLocation && (
        <button
          onClick={handleRecenter}
          className="absolute bottom-56 right-4 z-10 glass-panel p-3 rounded-2xl pointer-events-auto shadow-xl border border-white/20 bg-white/80 text-foreground hover:scale-[1.05] active:scale-[0.95] transition-all"
          title="Recenter to my location"
        >
          <Locate size={20} className="text-primary" />
        </button>
      )}
    </div>
  );
}
