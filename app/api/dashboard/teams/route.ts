// Team Management API Route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTeam, updateTeam, deleteTeam } from "@/lib/actions/team-management";
import { getTeamsForUser } from "@/lib/supabase/teams";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, paginationSchema } from "@/lib/utils/api-validation";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";

// Create team request schema
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

// GET /api/dashboard/teams
export async function GET(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      const userRole = req.user?.profile.role;
      const userId = req.user?.id;

      if (!["admin", "general_manager", "leader"].includes(userRole!)) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse query parameters for pagination
      const url = new URL(request.url);
      const queryParams = {
        page: url.searchParams.get("page") || "1",
        limit: url.searchParams.get("limit") || "10",
        sort: url.searchParams.get("sort") || "created_at",
        order: url.searchParams.get("order") || "desc",
      };

      const pagination = await validateRequest(queryParams, paginationSchema);

      // Get teams based on user role
      const teams = await getTeamsForUser(userId!, userRole!);

      // Simple client-side pagination for now
      const page = pagination.page ?? 1;
      const limit = pagination.limit ?? 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTeams = teams.slice(startIndex, endIndex);

      return NextResponse.json(
        successResponse("Teams retrieved successfully", {
          teams: paginatedTeams,
          pagination: {
            page,
            limit,
            total: teams.length,
            totalPages: Math.ceil(teams.length / limit),
          },
        })
      );
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// POST /api/dashboard/teams
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions - only admin and GM can create teams
      const userRole = req.user?.profile.role;
      if (!["admin", "general_manager"].includes(userRole!)) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, createTeamSchema);

      // Create FormData for compatibility with existing action
      const formData = new FormData();
      formData.append("name", validatedData.name);
      if (validatedData.description) {
        formData.append("description", validatedData.description);
      }
      formData.append("is_active", (validatedData.is_active ?? true).toString());

      // Call existing team creation action
      const result = await createTeam(formData);

      if (result.error) {
        const errorMessage = typeof result.error === "string" ? result.error : "Failed to create team";
        return NextResponse.json(errorResponse(errorMessage), { status: 400 });
      }

      return NextResponse.json(successResponse("Team created successfully", result.data), { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
