import { z } from "zod";

// Validation schema for creating/updating contact groups
export const contactGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name too long").trim(),
  description: z.string().max(500, "Description too long").optional().or(z.literal("")),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
    .optional()
    .default("#3B82F6"),
  icon: z.string().min(1, "Icon is required").max(50, "Icon name too long").optional().default("Users"),
});

// Schema for updating contact groups (all fields optional)
export const updateContactGroupSchema = contactGroupSchema.partial();

// Schema for creating contact groups
export const createContactGroupSchema = contactGroupSchema;
