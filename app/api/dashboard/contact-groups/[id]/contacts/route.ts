import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, paginationSchema } from "@/lib/utils/api-validation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/rbac";

// GET /api/dashboard/contact-groups/[id]/contacts - Get contacts by group ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_contacts")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const { id } = await params;

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

      // Check if group exists and get group info
      let isAllContactsGroup = false;
      if (id !== "all") {
        const { data: group } = await supabase.from("contact_groups").select("id, name").eq("id", id).single();

        if (!group) {
          return NextResponse.json(errorResponse("Contact group not found"), { status: 404 });
        }

        // Check if this is the "All Contacts" group
        isAllContactsGroup = group.name === "All Contacts";
      } else {
        isAllContactsGroup = true;
      }

      // Build query based on group ID
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

      // Apply group filter
      if (!isAllContactsGroup) {
        // For specific groups, show contacts with that group_id
        query = query.eq("group_id", id);
      }
      // For "All Contacts" group, don't filter - show all contacts

      // Apply search filter if provided
      if (search) {
        query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Apply pagination
      const limit = pagination.limit || 50;
      const offset = ((pagination.page || 1) - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: contacts, error } = await query;

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(errorResponse("Failed to fetch contacts"), { status: 500 });
      }

      // Get total count for pagination
      let countQuery = supabase.from("contacts").select("*", { count: "exact", head: true });

      if (!isAllContactsGroup) {
        countQuery = countQuery.eq("group_id", id);
      }

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
