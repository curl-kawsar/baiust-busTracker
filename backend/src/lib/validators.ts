import { z } from "zod";

// User validation schemas
export const userRoles = [
  "Admin",
  "Student",
  "Staff",
  "Faculty",
  "Coordinator",
] as const;

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be less than 128 characters"),
  role: z.enum(userRoles, { message: "Invalid role" }),
  institutionId: z
    .string()
    .min(3, "Institution ID must be at least 3 characters")
    .max(50, "Institution ID must be less than 50 characters")
    .trim()
    .optional(),
  department: z
    .string()
    .max(100, "Department must be less than 100 characters")
    .trim()
    .optional(),
  session: z
    .string()
    .max(20, "Session must be less than 20 characters")
    .trim()
    .optional(),
  isEligible: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim()
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim()
    .optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be less than 128 characters")
    .optional(),
  role: z.enum(userRoles, { message: "Invalid role" }).optional(),
  institutionId: z
    .string()
    .min(3, "Institution ID must be at least 3 characters")
    .max(50, "Institution ID must be less than 50 characters")
    .trim()
    .optional(),
  department: z
    .string()
    .max(100, "Department must be less than 100 characters")
    .trim()
    .optional(),
  session: z
    .string()
    .max(20, "Session must be less than 20 characters")
    .trim()
    .optional(),
  isEligible: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

// Bus validation schemas
export const createBusSchema = z.object({
  busId: z
    .string()
    .min(1, "Bus ID is required")
    .max(50, "Bus ID must be less than 50 characters")
    .trim(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  licensePlate: z
    .string()
    .max(20, "License plate must be less than 20 characters")
    .optional(),
  capacity: z
    .number()
    .int()
    .positive("Capacity must be a positive number")
    .optional(),
});

// Crew validation schemas
export const crewRoles = ["Driver", "Supervisor"] as const;

export const createCrewSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  role: z.enum(crewRoles, { message: "Invalid crew role" }),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 characters")
    .max(20, "Phone must be less than 20 characters")
    .trim(),
  busId: z.string().optional(),
  pictureUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export const updateCrewSchema = createCrewSchema.partial();

// Pickup Point validation schemas
export const createPickupPointSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  lat: z.number().min(-90).max(90, "Invalid latitude"),
  lng: z.number().min(-180).max(180, "Invalid longitude"),
});

export const updatePickupPointSchema = createPickupPointSchema.partial();

// Route validation schemas
export const createRouteSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  startName: z.string().min(1, "Start name is required").trim(),
  startLat: z.number().min(-90).max(90, "Invalid start latitude"),
  startLng: z.number().min(-180).max(180, "Invalid start longitude"),
  endName: z.string().min(1, "End name is required").trim(),
  endLat: z.number().min(-90).max(90, "Invalid end latitude"),
  endLng: z.number().min(-180).max(180, "Invalid end longitude"),
  waypoints: z
    .array(
      z.object({
        pickupPointId: z.string().min(1, "Pickup point ID is required"),
        delayMinutes: z
          .number()
          .int()
          .min(0, "Delay must be a non-negative number"),
      }),
    )
    .optional()
    .default([]),
});

// Schedule validation schemas
export const createScheduleSchema = z.object({
  busId: z.string().min(1, "Bus ID is required"),
  departureTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
});

// Announcement validation schemas
export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim(),
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message must be less than 5000 characters")
    .trim(),
  fileUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

// Bulk student creation schema
export const bulkStudentSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  institutionId: z
    .string()
    .min(3, "Student ID must be at least 3 characters")
    .max(50, "Student ID must be less than 50 characters")
    .trim(),
  department: z
    .string()
    .max(100, "Department must be less than 100 characters")
    .trim()
    .optional(),
  session: z
    .string()
    .max(20, "Session must be less than 20 characters")
    .trim()
    .optional(),
  isEligible: z.boolean().optional().default(false),
});

export const bulkCreateStudentsSchema = z.object({
  students: z
    .array(bulkStudentSchema)
    .min(1, "At least one student is required")
    .max(500, "Maximum 500 students per batch"),
  defaultPassword: z
    .string()
    .min(6, "Default password must be at least 6 characters")
    .max(128, "Default password must be less than 128 characters")
    .optional()
    .default("baiust123"),
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBusInput = z.infer<typeof createBusSchema>;
export type CreateCrewInput = z.infer<typeof createCrewSchema>;
export type UpdateCrewInput = z.infer<typeof updateCrewSchema>;
export type CreatePickupPointInput = z.infer<typeof createPickupPointSchema>;
export type UpdatePickupPointInput = z.infer<typeof updatePickupPointSchema>;
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type BulkStudentInput = z.infer<typeof bulkStudentSchema>;
export type BulkCreateStudentsInput = z.infer<typeof bulkCreateStudentsSchema>;
