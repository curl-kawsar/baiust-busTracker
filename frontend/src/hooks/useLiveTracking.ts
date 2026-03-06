import { useEffect, useState } from "react";

export interface BusLocation {
  id: string;
  lat: number;
  lng: number;
  speed?: number;
  timestamp?: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

export function useLiveTracking(deviceIds: string[]) {
  const [locations, setLocations] = useState<Record<string, BusLocation>>({});

  useEffect(() => {
    if (deviceIds.length === 0) return;

    const fetchLocations = async () => {
      for (const id of deviceIds) {
        try {
          const res = await fetch(`${BACKEND_URL}/hardware/data/${id}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.lat) {
              setLocations((prev) => ({
                ...prev,
                [id]: {
                  id,
                  lat: data.lat || data.latitude,
                  lng: data.lon || data.lng || data.longitude,
                  speed: data.speed_kph || data.speed,
                  timestamp: data.server_ts || data.timestamp,
                },
              }));
            }
          }
        } catch (e) {
          console.warn(`Polling error for ${id}:`, e);
        }
      }
    };

    // Initial fetch
    fetchLocations();

    // Poll every 5 seconds
    const interval = setInterval(fetchLocations, 5000);

    return () => clearInterval(interval);
  }, [JSON.stringify(deviceIds)]);

  return locations;
}
