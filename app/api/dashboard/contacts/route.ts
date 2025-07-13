// Contacts API Route with withAuth middleware
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, paginationSchema } from "@/lib/utils/api-validation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/rbac";

// Validation schema for creating/updating contacts
const contactSchema = z.object({
  phone_number: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format. Use international format with country code (e.g., +6281234567890)"),
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  group_id: z.string().nullable().optional(),
  group_name: z.string().optional(),
  custom_fields: z.record(z.any()).optional(),
});

// GET /api/dashboard/contacts - Fetch contacts with optional filtering
export async function GET(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse query parameters
      const url = new URL(request.url);
      const queryParams = {
        page: url.searchParams.get("page") || "1",
        limit: url.searchParams.get("limit") || "50",
        sort: url.searchParams.get("sort") || "created_at",
        order: url.searchParams.get("order") || "desc",
        search: url.searchParams.get("search") || undefined,
      };

      const pagination = await validateRequest(queryParams, paginationSchema);
      const search = queryParams.search;

      const supabase = await createClient();

      // Build query based on user role and team
      let query = supabase
        .from("contacts")
        .select(
          `
          id,
          phone_number,
          name,
          email,
          profile_picture_url,
          tags,
          custom_fields,
          group_id,
          group_name,
          last_interaction_at,
          created_by,
          created_at,
          updated_at
        `
        )
        .order(pagination.sort || "created_at", { ascending: pagination.order === "asc" });

      // Apply search filter if provided
      if (search) {
        query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Apply pagination
      const limit = pagination.limit || 50;
      const offset = ((pagination.page || 1) - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      // Role-based filtering is handled by RLS policies in the database
      const { data: contacts, error } = await query;

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(errorResponse("Failed to fetch contacts"), { status: 500 });
      }

      // Get total count for pagination
      let countQuery = supabase.from("contacts").select("*", { count: "exact", head: true });

      if (search) {
        countQuery = countQuery.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error("Count error:", countError);
        return NextResponse.json(errorResponse("Failed to get contact count"), { status: 500 });
      }

      const responseData = {
        contacts: contacts || [],
        pagination: {
          page: pagination.page || 1,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: (count || 0) > offset + limit,
        },
      };

      return NextResponse.json(successResponse("Contacts retrieved successfully", responseData));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// POST /api/dashboard/contacts - Create a new contact
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, contactSchema);

      const supabase = await createClient();

      // Prepare contact data
      const contactData = {
        phone_number: validatedData.phone_number,
        name: validatedData.name,
        email: validatedData.email || null,
        tags: validatedData.tags || [],
        group_id: validatedData.group_id || null,
        group_name: validatedData.group_name || null,
        custom_fields: validatedData.custom_fields || {},
        created_by: req.user!.id,
      };

      // Check if phone number already exists
      const { data: existingContact } = await supabase.from("contacts").select("id").eq("phone_number", validatedData.phone_number).single();

      if (existingContact) {
        return NextResponse.json(errorResponse("A contact with this phone number already exists"), { status: 409 });
      }

      // Insert new contact
      const { data: newContact, error } = await supabase
        .from("contacts")
        .insert([contactData])
        .select(
          `
          id,
          phone_number,
          name,
          email,
          profile_picture_url,
          tags,
          custom_fields,
          group_id,
          group_name,
          last_interaction_at,
          created_by,
          created_at,
          updated_at
        `
        )
        .single();

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(errorResponse("Failed to create contact"), { status: 500 });
      }

      return NextResponse.json(successResponse("Contact created successfully", { contact: newContact }), { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
