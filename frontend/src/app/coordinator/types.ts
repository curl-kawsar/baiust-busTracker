export type TabType = "buses" | "crew" | "routes" | "announcements" | "pickups" | "travel-history" | "fuel-management";

export interface Bus {
    _id: string;
    name: string;
    busId: string;
    vehicleType?: string;
    color?: string;
    capacity?: number;
    licensePlate?: string;
    expectedMileage?: number;
    fuelTankCapacity?: number;
    preferredFuelType?: string;
    currentOdometerReading?: number;
    lastMaintenanceOdometer?: number;
    maintenanceInterval?: number;
    isActive?: boolean;
    lastFuelDate?: string;
    notes?: string;
}

export interface Schedule {
    _id: string;
    time?: string;
    departureTime?: string;
    busIds: string[];
}

export interface ClientWaypoint {
    _id: string;
    pickupPointId: any;
    delayMinutes: number;
}

export interface Pickup {
    _id: string;
    name: string;
    lat: number;
    lng: number;
    description?: string;
    schedules?: Schedule[];
}

export interface Route {
    _id: string;
    name: string;
    startPointId: Pickup;
    endPointId: Pickup;
    startName?: string;
    startLat?: number;
    startLng?: number;
    endName?: string;
    endLat?: number;
    endLng?: number;
    waypoints: ClientWaypoint[];
    schedules?: Schedule[];
}

export interface Crew {
    _id: string;
    name: string;
    role: string;
    phone: string;
    busId?: string;
    pictureUrl?: string;
}

export interface Announcement {
    _id: string;
    title: string;
    message: string;
    fileUrl?: string;
    images?: string[];
}

export interface TravelHistory {
    _id: string;
    busId: any;
    routeId: any;
    departureTime: string;
    arrivalTime?: string;
    startLocation: {
        name: string;
        coordinates: { lat: number; lng: number };
    };
    endLocation: {
        name: string;
        coordinates: { lat: number; lng: number };
    };
    distance: number;
    status: "completed" | "in-progress" | "scheduled" | "cancelled";
    passengers: number;
    driver?: string;
}

export interface FuelRecord {
    _id: string;
    busId: any;
    date: string;
    liters: number;
    costPerLiter: number;
    totalCost: number;
    fuelType: string;
    fuelStation?: string;
    addedBy: any;
}

export const VEHICLE_TYPES = ["Bus", "Microbus", "Car", "Bike", "Ambulance", "Pickup", "Truck", "Other"] as const;

export const FLEET_COLORS = [
    { label: "Blue", value: "#3b82f6" },
    { label: "Green", value: "#10b981" },
    { label: "Amber", value: "#f59e0b" },
    { label: "Red", value: "#ef4444" },
    { label: "Violet", value: "#8b5cf6" },
    { label: "Pink", value: "#ec4899" },
    { label: "Cyan", value: "#06b6d4" },
    { label: "Orange", value: "#f97316" },
    { label: "Lime", value: "#84cc16" },
    { label: "Slate", value: "#64748b" },
];
