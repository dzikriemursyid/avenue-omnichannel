// Contact Group Contacts API Route
import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, idParamsSchema } from "@/lib/utils/api-validation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/rbac";

// GET /api/dashboard/contact-groups/[id]/contacts - Fetch contacts from a specific group
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Validate ID parameter
      const { id: groupId } = await params;
      const validatedParams = await validateRequest({ id: groupId }, idParamsSchema);

      const supabase = await createClient();

      // First, verify the group exists and user has access
      const { data: group, error: groupError } = await supabase.from("contact_groups").select("id, name, contact_count").eq("id", validatedParams.id).single();

      if (groupError || !group) {
        return NextResponse.json(errorResponse("Contact group not found"), { status: 404 });
      }

      // Parse query parameters for pagination
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      // Fetch contacts from the group with basic info needed for variable preview
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select(
          `
          id,
          name,
          email,
          phone_number,
          custom_fields
        `
        )
        .eq("group_id", validatedParams.id)
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(errorResponse("Failed to fetch contacts"), { status: 500 });
      }

      // Transform contacts to include computed fields for variable mapping
      const transformedContacts =
        contacts?.map((contact) => ({
          id: contact.id,
          name: contact.name || "Unknown", // Always use full name for name variable
          first_name: contact.name ? contact.name.split(" ")[0] : "Unknown",
          last_name: contact.name ? contact.name.split(" ").slice(1).join(" ") : "",
          email: contact.email || "",
          phone: contact.phone_number,
          phone_number: contact.phone_number,
          company_name: contact.custom_fields?.company_name || contact.custom_fields?.company || "",
          company: contact.custom_fields?.company_name || contact.custom_fields?.company || "",
          // Add any other custom fields that might be useful
          ...contact.custom_fields,
        })) || [];

      return NextResponse.json(
        successResponse("Contacts retrieved successfully", {
          contacts: transformedContacts,
          group: {
            id: group.id,
            name: group.name,
            contact_count: group.contact_count,
          },
          pagination: {
            limit,
            offset,
            total: group.contact_count,
          },
        })
      );
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
