// User types
export type UserRole =
  | "Admin"
  | "Student"
  | "Staff"
  | "Faculty"
  | "Coordinator";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId?: string; // Student ID or Staff ID
  department?: string;
  session?: string; // For students (e.g., "2021-2022")
  isEligible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  institutionId?: string;
  department?: string;
  session?: string;
  isEligible?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  institutionId?: string;
  department?: string;
  session?: string;
  isEligible?: boolean;
}

export interface BulkStudentInput {
  name: string;
  email: string;
  institutionId: string;
  department?: string;
  session?: string;
  isEligible?: boolean;
}

export interface BulkCreateStudentsInput {
  students: BulkStudentInput[];
  defaultPassword?: string;
}

export interface BulkCreateStudentsResponse {
  message: string;
  created: number;
  students: {
    id: string;
    name: string;
    email: string;
    institutionId: string;
    department?: string;
    session?: string;
    isEligible: boolean;
  }[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    errors?: Record<string, string[]>;
  };
}

export interface PaginatedResponse<T> {
  users: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserStats {
  total: number;
  byRole: {
    Admin: number;
    Coordinator: number;
    Student: number;
    Staff: number;
    Faculty: number;
  };
  eligible: number;
  ineligible: number;
}

export interface IUMSSVerification {
  email: string;
  isRegisteredAndPaid: boolean;
  session: string;
  studentId: string;
  department: string;
  verifiedAt: string;
}

// Bus / Vehicle types
export type VehicleType = "Bus" | "Microbus" | "Car" | "Bike" | "Ambulance" | "Pickup" | "Truck" | "Other";

export interface Bus {
  _id: string;
  busId: string;
  name: string;
  vehicleType?: VehicleType;
  color?: string;
  licensePlate?: string;
  capacity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusInput {
  busId: string;
  name: string;
  vehicleType?: VehicleType;
  color?: string;
  licensePlate?: string;
  capacity?: number;
}

// Crew types
export type CrewRole = "Driver" | "Supervisor";

export interface Crew {
  _id: string;
  name: string;
  role: CrewRole;
  phone: string;
  busId?: string;
  pictureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCrewInput {
  name: string;
  role: CrewRole;
  phone: string;
  busId?: string;
  pictureUrl?: string;
}

// Pickup Point types
export interface PickupPoint {
  _id: string;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  schedules: { busId: string; time: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePickupPointInput {
  name: string;
  description?: string;
  lat: number;
  lng: number;
}

// Route types
export interface RouteWaypoint {
  pickupPointId: string | PickupPoint;
  delayMinutes: number;
}

export interface TransportRoute {
  _id: string;
  name: string;
  startName: string;
  startLat: number;
  startLng: number;
  endName: string;
  endLat: number;
  endLng: number;
  waypoints: RouteWaypoint[];
  schedules?: Schedule[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRouteInput {
  name: string;
  startName: string;
  startLat: number;
  startLng: number;
  endName: string;
  endLat: number;
  endLng: number;
  waypoints?: { pickupPointId: string; delayMinutes: number }[];
}

// Schedule types
export interface Schedule {
  _id: string;
  routeId: string;
  busId: string;
  departureTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  busId: string;
  departureTime: string;
}

// Announcement types
export interface Announcement {
  _id: string;
  title: string;
  message: string;
  fileUrl?: string;
  images?: string[];
  postedBy: {
    _id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  fileUrl?: string;
  images?: string[];
}
