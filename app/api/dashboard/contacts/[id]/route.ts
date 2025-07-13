// Individual Contact API Route with withAuth middleware
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, idParamsSchema } from "@/lib/utils/api-validation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/rbac";

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
  group_id: z.string().nullable().optional(),
  group_name: z.string().optional(),
  custom_fields: z.record(z.any()).optional(),
});

// GET /api/dashboard/contacts/[id] - Get a specific contact
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Validate ID parameter
      const { id: contactId } = await params;
      const validatedParams = await validateRequest({ id: contactId }, idParamsSchema);

      const supabase = await createClient();

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
          group_id,
          group_name,
          last_interaction_at,
          created_by,
          created_at,
          updated_at
        `
        )
        .eq("id", validatedParams.id)
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
      return handleApiError(error);
    }
  })(request);
}

// PUT /api/dashboard/contacts/[id] - Update a contact
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Validate ID parameter
      const { id: contactId } = await params;
      const validatedParams = await validateRequest({ id: contactId }, idParamsSchema);

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, updateContactSchema);

      const supabase = await createClient();

      // Check if contact exists and user has access to it
      const { data: existingContact, error: fetchError } = await supabase.from("contacts").select("id, phone_number").eq("id", validatedParams.id).single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          return NextResponse.json(errorResponse("Contact not found"), { status: 404 });
        }
        console.error("Database error:", fetchError);
        return NextResponse.json(errorResponse("Failed to fetch contact"), { status: 500 });
      }

      // If updating phone number, check for duplicates
      if (validatedData.phone_number && validatedData.phone_number !== existingContact.phone_number) {
        const { data: duplicateContact } = await supabase.from("contacts").select("id").eq("phone_number", validatedData.phone_number).neq("id", validatedParams.id).single();

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
      if (validatedData.group_id !== undefined) updateData.group_id = validatedData.group_id || null;
      if (validatedData.group_name !== undefined) updateData.group_name = validatedData.group_name || null;
      if (validatedData.custom_fields !== undefined) updateData.custom_fields = validatedData.custom_fields;

      // Update contact
      const { data: updatedContact, error } = await supabase
        .from("contacts")
        .update(updateData)
        .eq("id", validatedParams.id)
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
        return NextResponse.json(errorResponse("Failed to update contact"), { status: 500 });
      }

      return NextResponse.json(successResponse("Contact updated successfully", { contact: updatedContact }));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// DELETE /api/dashboard/contacts/[id] - Delete a contact
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Validate ID parameter
      const { id: contactId } = await params;
      const validatedParams = await validateRequest({ id: contactId }, idParamsSchema);

      const supabase = await createClient();

      // Check if contact exists and user has access to it
      const { data: existingContact, error: fetchError } = await supabase.from("contacts").select("id, name").eq("id", validatedParams.id).single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          return NextResponse.json(errorResponse("Contact not found"), { status: 404 });
        }
        console.error("Database error:", fetchError);
        return NextResponse.json(errorResponse("Failed to fetch contact"), { status: 500 });
      }

      // Delete contact - this will cascade to related records due to foreign key constraints
      const { error } = await supabase.from("contacts").delete().eq("id", validatedParams.id);

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(errorResponse("Failed to delete contact"), { status: 500 });
      }

      return NextResponse.json(successResponse("Contact deleted successfully"), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
