import { Context } from "hono";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(public errors: Record<string, string[]>) {
    super("Validation failed", 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

// Format Zod errors into a cleaner structure
export function formatZodError(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "root";
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

// Standard API response helpers
export function successResponse<T>(
  c: Context,
  data: T,
  statusCode: number = 200,
) {
  return c.json({ success: true, data }, statusCode as any);
}

export function errorResponse(
  c: Context,
  message: string,
  statusCode: number = 500,
  code?: string,
  errors?: Record<string, string[]>,
) {
  return c.json(
    {
      success: false,
      error: {
        message,
        code,
        ...(errors && { errors }),
      },
    },
    statusCode as any,
  );
}

// Error handler helper for route handlers
export function handleError(c: Context, error: unknown) {
  console.error("[ERROR]", error);

  if (error instanceof ValidationError) {
    return errorResponse(
      c,
      error.message,
      error.statusCode,
      error.code,
      error.errors,
    );
  }

  if (error instanceof AppError) {
    return errorResponse(c, error.message, error.statusCode, error.code);
  }

  if (error instanceof ZodError) {
    const formatted = formatZodError(error);
    return errorResponse(
      c,
      "Validation failed",
      400,
      "VALIDATION_ERROR",
      formatted,
    );
  }

  // MongoDB duplicate key error
  if ((error as any)?.code === 11000) {
    return errorResponse(c, "Resource already exists", 409, "CONFLICT");
  }

  // MongoDB cast error (invalid ObjectId)
  if ((error as any)?.name === "CastError") {
    return errorResponse(c, "Invalid ID format", 400, "INVALID_ID");
  }

  return errorResponse(c, "Internal server error", 500, "INTERNAL_ERROR");
}
