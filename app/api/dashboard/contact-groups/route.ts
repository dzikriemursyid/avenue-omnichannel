import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest } from "@/lib/utils/api-validation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/rbac";
import { contactGroupSchema } from "@/lib/validation/contact-groups";

// GET /api/dashboard/contact-groups - Fetch all contact groups
export async function GET(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const supabase = await createClient();

      const { data: groups, error } = await supabase.from("contact_groups").select("*").order("name", { ascending: true });

      if (error) {
        console.error("Error fetching contact groups:", error);
        return NextResponse.json(errorResponse("Failed to fetch contact groups"), { status: 500 });
      }

      return NextResponse.json(successResponse("Contact groups retrieved successfully", groups));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// POST /api/dashboard/contact-groups - Create a new contact group
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const body = await req.json();
      const validatedData = await validateRequest(body, contactGroupSchema);

      const supabase = await createClient();

      // Check if group name already exists
      const { data: existingGroup } = await supabase.from("contact_groups").select("id").eq("name", validatedData.name).single();

      if (existingGroup) {
        return NextResponse.json(errorResponse("A group with this name already exists"), { status: 409 });
      }

      const { data: group, error } = await supabase
        .from("contact_groups")
        .insert({
          ...validatedData,
          created_by: req.user!.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating contact group:", error);
        return NextResponse.json(errorResponse("Failed to create contact group"), { status: 500 });
      }

      return NextResponse.json(successResponse("Contact group created successfully", group), { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
