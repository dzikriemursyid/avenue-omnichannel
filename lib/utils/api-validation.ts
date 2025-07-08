// API Validation utilities using Zod

import { z } from "zod";
import { validationError } from "./api-error";

export async function validateRequest<T>(data: unknown, schema: z.ZodSchema<T>): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};

      error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      throw validationError(errors);
    }
    throw error;
  }
}

// Common validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
});

export const idParamsSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

export const searchSchema = z.object({
  q: z.string().min(1).optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

// Helper to parse search params
export function parseSearchParams<T>(searchParams: URLSearchParams, schema: z.ZodSchema<T>): T {
  const params: Record<string, any> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return schema.parse(params);
}
