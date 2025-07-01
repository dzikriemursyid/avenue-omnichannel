// API Error handling utilities

import { NextResponse } from "next/server";
import { createApiResponse } from "./api-response";

export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(createApiResponse(false, error.message, undefined, error.errors), { status: error.statusCode });
  }

  console.error("API Error:", error);
  return NextResponse.json(createApiResponse(false, "Internal server error"), { status: 500 });
}

// Common error responses
export const unauthorizedError = () => new ApiError(401, "Unauthorized access");
export const forbiddenError = () => new ApiError(403, "Forbidden");
export const notFoundError = (resource: string) => new ApiError(404, `${resource} not found`);
export const validationError = (errors: Record<string, string[]>) => new ApiError(400, "Validation failed", errors);
export const serverError = (message: string = "Internal server error") => new ApiError(500, message);
