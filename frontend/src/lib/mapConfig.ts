/**
 * Map Provider Configuration
 *
 * Set NEXT_PUBLIC_MAP_PROVIDER in your .env to switch providers:
 *   - "mapbox"  (default) — uses Mapbox GL JS via react-map-gl
 *   - "google"  — uses Google Maps JavaScript API via @react-google-maps/api
 *
 * Required env vars per provider:
 *   mapbox: NEXT_PUBLIC_MAPBOX_TOKEN
 *   google: NEXT_PUBLIC_GOOGLE_MAPS_KEY
 */

export type MapProvider = "mapbox" | "google";

export function getMapProvider(): MapProvider {
  const env = process.env.NEXT_PUBLIC_MAP_PROVIDER?.toLowerCase();
  if (env === "google") return "google";
  return "mapbox"; // default
}

export function getMapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
}

export function getGoogleMapsKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
}

/**
 * Returns map style for the current provider and theme.
 */
export function getMapStyle(theme: string, provider?: MapProvider): string {
  const p = provider || getMapProvider();
  if (p === "google") {
    // Google Maps uses mapId for styling; return empty for default
    return "";
  }
  return theme === "dark"
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11";
}

/**
 * Fetches route directions geometry (GeoJSON LineString) from the appropriate provider.
 *
 * @param coords Array of { lat, lng } waypoints (at least 2)
 * @param mode "driving" | "walking"
 * @returns GeoJSON geometry or null
 */
export async function fetchDirections(
  coords: { lat: number; lng: number }[],
  mode: "driving" | "walking" = "driving",
): Promise<{ geometry: any; distance?: number; duration?: number } | null> {
  const provider = getMapProvider();

  if (provider === "google") {
    return fetchGoogleDirections(coords, mode);
  }
  return fetchMapboxDirections(coords, mode);
}

async function fetchMapboxDirections(
  coords: { lat: number; lng: number }[],
  mode: "driving" | "walking",
): Promise<{ geometry: any; distance?: number; duration?: number } | null> {
  const token = getMapboxToken();
  if (!token) return null;

  const profile = mode === "walking" ? "walking" : "driving";
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordStr}?geometries=geojson&overview=full&access_token=${token}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
    };
  } catch {
    return null;
  }
}

async function fetchGoogleDirections(
  coords: { lat: number; lng: number }[],
  mode: "driving" | "walking",
): Promise<{ geometry: any; distance?: number; duration?: number } | null> {
  const key = getGoogleMapsKey();
  if (!key || coords.length < 2) return null;

  const origin = coords[0];
  const destination = coords[coords.length - 1];
  const waypoints = coords.slice(1, -1);

  try {
    // Use Google Routes API v2 (REST) — works client-side unlike legacy Directions API
    const res = await fetch(
      `https://routes.googleapis.com/directions/v2:computeRoutes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: { latitude: origin.lat, longitude: origin.lng },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lng,
              },
            },
          },
          intermediates: waypoints.map((w) => ({
            location: {
              latLng: { latitude: w.lat, longitude: w.lng },
            },
          })),
          travelMode: mode === "walking" ? "WALK" : "DRIVE",
          polylineEncoding: "GEO_JSON_LINESTRING",
        }),
      },
    );

    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    // The polyline is returned as an encoded polyline, decode to GeoJSON
    const geometry = route.polyline?.geoJsonLinestring || decodeGooglePolyline(route.polyline?.encodedPolyline);

    return {
      geometry,
      distance: route.distanceMeters,
      duration: route.duration ? parseInt(route.duration) : undefined,
    };
  } catch {
    return null;
  }
}

/** Decode a Google encoded polyline string into GeoJSON LineString geometry */
function decodeGooglePolyline(encoded: string | undefined): any {
  if (!encoded) return { type: "LineString", coordinates: [] };

  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return { type: "LineString", coordinates };
}
