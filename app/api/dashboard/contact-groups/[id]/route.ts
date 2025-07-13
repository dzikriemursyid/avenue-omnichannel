import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest } from "@/lib/utils/api-validation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/rbac";
import { updateContactGroupSchema } from "@/lib/validation/contact-groups";

// GET /api/dashboard/contact-groups/[id] - Get a specific contact group
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const { id } = await params;
      const supabase = await createClient();

      const { data: group, error } = await supabase.from("contact_groups").select("*").eq("id", id).single();

      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json(errorResponse("Contact group not found"), { status: 404 });
        }
        console.error("Error fetching contact group:", error);
        return NextResponse.json(errorResponse("Failed to fetch contact group"), { status: 500 });
      }

      return NextResponse.json(successResponse("Contact group retrieved successfully", group));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// PUT /api/dashboard/contact-groups/[id] - Update a contact group
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const { id } = await params;
      const body = await req.json();
      const validatedData = await validateRequest(body, updateContactGroupSchema);

      const supabase = await createClient();

      // Check if group exists
      const { data: existingGroup } = await supabase.from("contact_groups").select("id").eq("id", id).single();

      if (!existingGroup) {
        return NextResponse.json(errorResponse("Contact group not found"), { status: 404 });
      }

      // Check if name is being updated and if it conflicts with existing groups
      if (validatedData.name) {
        const { data: nameConflict } = await supabase.from("contact_groups").select("id").eq("name", validatedData.name).neq("id", id).single();

        if (nameConflict) {
          return NextResponse.json(errorResponse("A group with this name already exists"), { status: 409 });
        }
      }

      const { data: group, error } = await supabase.from("contact_groups").update(validatedData).eq("id", id).select().single();

      if (error) {
        console.error("Error updating contact group:", error);
        return NextResponse.json(errorResponse("Failed to update contact group"), { status: 500 });
      }

      return NextResponse.json(successResponse("Contact group updated successfully", group));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// DELETE /api/dashboard/contact-groups/[id] - Delete a contact group
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const { id } = await params;
      const supabase = await createClient();

      // Check if group exists
      const { data: existingGroup } = await supabase.from("contact_groups").select("id, name").eq("id", id).single();

      if (!existingGroup) {
        return NextResponse.json(errorResponse("Contact group not found"), { status: 404 });
      }

      // Prevent deletion of "All Contacts" group
      if (existingGroup.name === "All Contacts") {
        return NextResponse.json(errorResponse("Cannot delete the default 'All Contacts' group"), { status: 400 });
      }

      // First, update all contacts in this group to remove group assignment
      await supabase.from("contacts").update({ group_id: null }).eq("group_id", id);

      // Then delete the group
      const { error } = await supabase.from("contact_groups").delete().eq("id", id);

      if (error) {
        console.error("Error deleting contact group:", error);
        return NextResponse.json(errorResponse("Failed to delete contact group"), { status: 500 });
      }

      return NextResponse.json(successResponse("Contact group deleted successfully"));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
