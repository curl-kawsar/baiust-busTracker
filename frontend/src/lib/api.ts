import { getToken } from "./auth";
import type {
  ApiResponse,
  User,
  CreateUserInput,
  UpdateUserInput,
  PaginatedResponse,
  UserStats,
  IUMSSVerification,
  Bus,
  CreateBusInput,
  Crew,
  CreateCrewInput,
  PickupPoint,
  CreatePickupPointInput,
  TransportRoute,
  CreateRouteInput,
  Schedule,
  CreateScheduleInput,
  Announcement,
  CreateAnnouncementInput,
  BulkCreateStudentsInput,
  BulkCreateStudentsResponse,
} from "@/types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || { message: data.message || "Request failed" },
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: { message: "Network error. Please try again." },
    };
  }
}

// ============================================
// USER API
// ============================================

export const userApi = {
  // Get all users with pagination
  getUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.role) searchParams.set("role", params.role);
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<User>>(
      `/auth/users${query ? `?${query}` : ""}`,
    );
  },

  // Get single user
  getUser: (id: string) => apiRequest<User>(`/auth/users/${id}`),

  // Create user
  createUser: (data: CreateUserInput) =>
    apiRequest<{ message: string; user: User }>("/auth/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update user
  updateUser: (id: string, data: UpdateUserInput) =>
    apiRequest<{ message: string; user: User }>(`/auth/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete user
  deleteUser: (id: string) =>
    apiRequest<{ message: string }>(`/auth/users/${id}`, {
      method: "DELETE",
    }),

  // Bulk update eligibility
  bulkUpdateEligibility: (userIds: string[], isEligible: boolean) =>
    apiRequest<{ message: string; modifiedCount: number }>(
      "/auth/users/bulk/eligibility",
      {
        method: "PATCH",
        body: JSON.stringify({ userIds, isEligible }),
      },
    ),

  // Bulk create students
  bulkCreateStudents: (data: BulkCreateStudentsInput) =>
    apiRequest<BulkCreateStudentsResponse>("/auth/users/bulk/students", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get user stats
  getStats: () => apiRequest<UserStats>("/auth/stats"),

  // Verify IUMSS eligibility
  verifyIUMSS: (email: string) =>
    apiRequest<IUMSSVerification>(
      `/auth/iumss/verify/${encodeURIComponent(email)}`,
    ),

  // Get current user
  getCurrentUser: () => apiRequest<User>("/auth/me"),
};

// ============================================
// BUS API
// ============================================

export const busApi = {
  getAll: () => apiRequest<Bus[]>("/buses"),

  create: (data: CreateBusInput) =>
    apiRequest<Bus>("/buses", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ message: string }>(`/buses/${id}`, {
      method: "DELETE",
    }),
};

// ============================================
// CREW API
// ============================================

export const crewApi = {
  getAll: () => apiRequest<Crew[]>("/crews"),

  create: (data: CreateCrewInput) =>
    apiRequest<{ message: string; crew: Crew }>("/crews", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateCrewInput>) =>
    apiRequest<{ message: string; crew: Crew }>(`/crews/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ message: string }>(`/crews/${id}`, {
      method: "DELETE",
    }),
};

// ============================================
// PICKUP POINT API
// ============================================

export const pickupApi = {
  getAll: () => apiRequest<PickupPoint[]>("/pickups"),

  create: (data: CreatePickupPointInput) =>
    apiRequest<{ message: string; point: PickupPoint }>("/pickups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreatePickupPointInput>) =>
    apiRequest<{ message: string; point: PickupPoint }>(`/pickups/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ message: string }>(`/pickups/${id}`, {
      method: "DELETE",
    }),
};

// ============================================
// ROUTE API
// ============================================

export const routeApi = {
  getAll: () => apiRequest<TransportRoute[]>("/routes"),

  create: (data: CreateRouteInput) =>
    apiRequest<TransportRoute>("/routes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ message: string }>(`/routes/${id}`, {
      method: "DELETE",
    }),

  // Schedules
  createSchedule: (routeId: string, data: CreateScheduleInput) =>
    apiRequest<Schedule>(`/routes/${routeId}/schedules`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteSchedule: (id: string) =>
    apiRequest<{ message: string }>(`/routes/schedules/${id}`, {
      method: "DELETE",
    }),
};

// ============================================
// ANNOUNCEMENT API
// ============================================

export const announcementApi = {
  getAll: () => apiRequest<Announcement[]>("/announcements"),

  create: (data: CreateAnnouncementInput) =>
    apiRequest<{ message: string; announcement: Announcement }>(
      "/announcements",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  delete: (id: string) =>
    apiRequest<{ message: string }>(`/announcements/${id}`, {
      method: "DELETE",
    }),
};
