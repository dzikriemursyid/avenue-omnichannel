import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profiles";
import { hasPermission } from "@/lib/supabase/rbac";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

// Validation schema for updating contacts
const updateContactSchema = z.object({
  phone_number: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format. Use international format with country code (e.g., +6281234567890)")
    .optional(),
  name: z.string().min(1, "Name is required").max(255, "Name too long").optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/contacts/[id] - Get a specific contact
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Validate contact ID
    if (!params.id || typeof params.id !== "string") {
      return NextResponse.json(errorResponse("Invalid contact ID"), { status: 400 });
    }

    // Fetch contact - RLS will handle team-based access
    const { data: contact, error } = await supabase
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
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(errorResponse("Contact not found"), { status: 404 });
      }
      console.error("Database error:", error);
      return NextResponse.json(errorResponse("Failed to fetch contact"), { status: 500 });
    }

    return NextResponse.json(successResponse("Contact retrieved successfully", { contact }));
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

// PUT /api/contacts/[id] - Update a contact
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Validate contact ID
    if (!params.id || typeof params.id !== "string") {
      return NextResponse.json(errorResponse("Invalid contact ID"), { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateContactSchema.parse(body);

    // Check if contact exists and user has access to it
    const { data: existingContact, error: fetchError } = await supabase.from("contacts").select("id, phone_number").eq("id", params.id).single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(errorResponse("Contact not found"), { status: 404 });
      }
      console.error("Database error:", fetchError);
      return NextResponse.json(errorResponse("Failed to fetch contact"), { status: 500 });
    }

    // If updating phone number, check for duplicates
    if (validatedData.phone_number && validatedData.phone_number !== existingContact.phone_number) {
      const { data: duplicateContact } = await supabase.from("contacts").select("id").eq("phone_number", validatedData.phone_number).neq("id", params.id).single();

      if (duplicateContact) {
        return NextResponse.json(errorResponse("A contact with this phone number already exists"), { status: 409 });
      }
    }

    // Prepare update data - only include fields that were provided
    const updateData: any = {};
    if (validatedData.phone_number !== undefined) updateData.phone_number = validatedData.phone_number;
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.email !== undefined) updateData.email = validatedData.email || null;
    if (validatedData.tags !== undefined) updateData.tags = validatedData.tags;
    if (validatedData.custom_fields !== undefined) updateData.custom_fields = validatedData.custom_fields;

    // Update contact
    const { data: updatedContact, error } = await supabase
      .from("contacts")
      .update(updateData)
      .eq("id", params.id)
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
      return NextResponse.json(errorResponse("Failed to update contact"), { status: 500 });
    }

    return NextResponse.json(successResponse("Contact updated successfully", { contact: updatedContact }));
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

// DELETE /api/contacts/[id] - Delete a contact
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Validate contact ID
    if (!params.id || typeof params.id !== "string") {
      return NextResponse.json(errorResponse("Invalid contact ID"), { status: 400 });
    }

    // Check if contact exists and user has access to it
    const { data: existingContact, error: fetchError } = await supabase.from("contacts").select("id, name").eq("id", params.id).single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(errorResponse("Contact not found"), { status: 404 });
      }
      console.error("Database error:", fetchError);
      return NextResponse.json(errorResponse("Failed to fetch contact"), { status: 500 });
    }

    // Delete contact - this will cascade to related records due to foreign key constraints
    const { error } = await supabase.from("contacts").delete().eq("id", params.id);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(errorResponse("Failed to delete contact"), { status: 500 });
    }

    return NextResponse.json(
      successResponse("Contact deleted successfully", {
        message: "Contact deleted successfully",
        deletedContact: { id: params.id, name: existingContact.name },
      })
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
