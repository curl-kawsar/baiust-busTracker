"use client";

import { Navbar } from "@/components/Navbar";
import { LiveMap, TransportRoute, COLORS } from "@/components/LiveMap";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, API_URL } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);

  const toggleRoute = useCallback((id: string) => {
    setSelectedRouteIds((prev) => (prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
    } else {
      setTimeout(() => setIsReady(true), 0);
    }
  }, [router]);

  // Fetch routes
  useEffect(() => {
    if (!isReady) return;
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/routes`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRoutes)
      .catch(console.error);
  }, [isReady]);

  if (!isReady) return null;

  return (
    <main className="w-full h-screen overflow-hidden flex flex-col relative">
      <Navbar
        routes={routes}
        selectedRouteIds={selectedRouteIds}
        onToggleRoute={toggleRoute}
        colors={COLORS}
      />

      <div className="flex-1 w-full h-full mt-16 relative z-0">
        <LiveMap routes={routes} selectedRouteIds={selectedRouteIds} onToggleRoute={toggleRoute} />
      </div>
    </main>
  );
}
