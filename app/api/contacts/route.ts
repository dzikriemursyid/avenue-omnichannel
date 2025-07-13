import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profiles";
import { hasPermission } from "@/lib/supabase/rbac";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

// Validation schema for creating/updating contacts
const contactSchema = z.object({
  phone_number: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format. Use international format with country code (e.g., +6281234567890)"),
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional(),
});

type ContactInput = z.infer<typeof contactSchema>;

// GET /api/contacts - Fetch contacts with optional filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    // Get user profile and check permissions
    const profile = await getUserProfile(user.id);
    if (!profile || !hasPermission(profile.role, "view_contacts")) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

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
        last_interaction_at,
        created_by,
        created_at,
        updated_at
      `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`);
    }

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
      contacts,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    };

    return NextResponse.json(successResponse("Contacts retrieved successfully", responseData));
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    // Get user profile and check permissions
    const profile = await getUserProfile(user.id);
    if (!profile || !hasPermission(profile.role, "view_contacts")) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = contactSchema.parse(body);

    // Prepare contact data
    const contactData = {
      phone_number: validatedData.phone_number,
      name: validatedData.name,
      email: validatedData.email || null,
      tags: validatedData.tags || [],
      custom_fields: validatedData.custom_fields || {},
      created_by: user.id,
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
    if (error instanceof z.ZodError) {
      // Convert Zod errors to the expected format
      const formattedErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const field = err.path.join(".");
        if (!formattedErrors[field]) {
          formattedErrors[field] = [];
        }
        formattedErrors[field].push(err.message);
      });

      return NextResponse.json(errorResponse("Validation error", formattedErrors), { status: 400 });
    }

    console.error("API error:", error);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
