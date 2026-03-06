"use client";

/**
 * Google Maps wrapper components.
 *
 * These provide a similar API surface to the Mapbox components used in the app
 * so the LiveMap, PickupManager, and RouteManager can switch providers cleanly.
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
  useMemo,
} from "react";
import {
  GoogleMap,
  useJsApiLoader,

  OverlayViewF,
  OverlayView,
  PolylineF,
} from "@react-google-maps/api";
import { getGoogleMapsKey } from "@/lib/mapConfig";

// ─── Types ───────────────────────────────────────────────────────────────

export interface GoogleMapRef {
  flyTo: (opts: { center: [number, number]; zoom?: number; duration?: number }) => void;
  fitBounds: (
    bounds: [[number, number], [number, number]],
    opts?: { duration?: number; padding?: any },
  ) => void;
  getMap: () => google.maps.Map | null;
}

interface MapProps {
  initialViewState: { longitude: number; latitude: number; zoom: number };
  style?: React.CSSProperties;
  mapStyle?: string;
  onClick?: (e: { lngLat: { lat: number; lng: number } }) => void;
  onMove?: (evt: { viewState: { zoom: number } }) => void;
  cursor?: string;
  children?: React.ReactNode;
}

interface GMarkerProps {
  longitude: number;
  latitude: number;
  anchor?: string;
  onClick?: (e: { originalEvent: { stopPropagation: () => void } }) => void;
  children?: React.ReactNode;
}

interface GSourceLayerProps {
  id: string;
  type: "geojson";
  data: any;
  children?: React.ReactNode;
}

interface GLayerProps {
  id: string;
  type: "line";
  paint?: Record<string, any>;
  layout?: Record<string, any>;
}

// ─── Google Map Component ────────────────────────────────────────────────

const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

export const GMapComponent = forwardRef<GoogleMapRef, MapProps>(function GMapComponent(
  { initialViewState, style, onClick, onMove, cursor, children },
  ref,
) {
  const apiKey = getGoogleMapsKey();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: "google-map-script",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode from DOM
  useEffect(() => {
    const root = document.documentElement;
    const initial = root.classList.contains("dark");
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set initial dark mode value outside the effect
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useImperativeHandle(ref, () => ({
    flyTo: ({ center, zoom, duration: _duration }) => {
      if (!mapRef.current) return;
      mapRef.current.panTo({ lat: center[1], lng: center[0] });
      if (zoom) mapRef.current.setZoom(zoom);
    },
    fitBounds: (bounds, opts) => {
      if (!mapRef.current) return;
      const sw = new google.maps.LatLng(bounds[0][1], bounds[0][0]);
      const ne = new google.maps.LatLng(bounds[1][1], bounds[1][0]);
      const gBounds = new google.maps.LatLngBounds(sw, ne);
      const padding = opts?.padding
        ? typeof opts.padding === "number"
          ? opts.padding
          : opts.padding
        : 40;
      mapRef.current.fitBounds(gBounds, padding);
    },
    getMap: () => mapRef.current,
  }));

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (onClick && e.latLng) {
        onClick({ lngLat: { lat: e.latLng.lat(), lng: e.latLng.lng() } });
      }
    },
    [onClick],
  );

  const handleZoomChanged = useCallback(() => {
    if (onMove && mapRef.current) {
      onMove({ viewState: { zoom: mapRef.current.getZoom() || 13 } });
    }
  }, [onMove]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy" as const,
      styles: isDark ? darkMapStyles : undefined,
      draggableCursor: cursor || undefined,
    }),
    [isDark, cursor],
  );

  if (!isLoaded) {
    return (
      <div style={style} className="flex items-center justify-center bg-accent">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={style || { width: "100%", height: "100%" }}
      center={{ lat: initialViewState.latitude, lng: initialViewState.longitude }}
      zoom={initialViewState.zoom}
      onLoad={onLoad}
      onClick={handleClick}
      onZoomChanged={handleZoomChanged}
      options={mapOptions}
    >
      {children}
    </GoogleMap>
  );
});

// ─── Google Marker (renders custom HTML via OverlayView) ─────────────────

export function GMarker({ longitude, latitude, onClick, children }: GMarkerProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (onClick) {
        onClick({ originalEvent: { stopPropagation: () => e.stopPropagation() } });
      }
    },
    [onClick],
  );

  return (
    <OverlayViewF
      position={{ lat: latitude, lng: longitude }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}
    >
      <div onClick={handleClick} style={{ cursor: onClick ? "pointer" : "default" }}>
        {children}
      </div>
    </OverlayViewF>
  );
}

// ─── Google Polyline Source/Layer (renders geojson lines) ────────────────

export function GSource({ data, children }: GSourceLayerProps) {
  // Extract coordinates from GeoJSON
  const coords = useMemo(() => {
    if (!data?.geometry?.coordinates) return [];
    return data.geometry.coordinates.map((c: [number, number]) => ({
      lat: c[1],
      lng: c[0],
    }));
  }, [data]);

  // Pass coords to child Layer components via React context
  return (
    <GSourceContext.Provider value={coords}>
      {children}
    </GSourceContext.Provider>
  );
}

const GSourceContext = React.createContext<google.maps.LatLngLiteral[]>([]);

export function GLayer({ id: _id, paint }: GLayerProps) {
  const coords = React.useContext(GSourceContext);

  if (coords.length < 2) return null;

  const color = paint?.["line-color"] || "#3b82f6";
  const weight = paint?.["line-width"] || 4;
  const opacity = paint?.["line-opacity"] || 0.8;
  const isDashed = paint?.["line-dasharray"];

  return (
    <PolylineF
      path={coords}
      options={{
        strokeColor: color,
        strokeWeight: weight,
        strokeOpacity: opacity,
        ...(isDashed ? { strokeOpacity: 0, icons: [{
          icon: { path: "M 0,-1 0,1", strokeOpacity: opacity, scale: weight },
          offset: "0",
          repeat: `${(isDashed[1] || 2) * weight * 2}px`,
        }]} : {}),
      }}
    />
  );
}

// ─── Google Popup ────────────────────────────────────────────────────────

interface GPopupProps {
  longitude: number;
  latitude: number;
  anchor?: string;
  onClose?: () => void;
  closeOnClick?: boolean;
  children?: React.ReactNode;
}

export function GPopup({ longitude, latitude, onClose, children }: GPopupProps) {
  return (
    <OverlayViewF
      position={{ lat: latitude, lng: longitude }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h + 10) })}
    >
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-border p-1 min-w-[120px]">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-1 right-1 p-0.5 text-foreground/30 hover:text-foreground rounded"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </OverlayViewF>
  );
}
