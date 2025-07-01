// Individual Team Management API Route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateTeam, deleteTeam } from "@/lib/actions/team-management";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, idParamsSchema } from "@/lib/utils/api-validation";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";

// Update team request schema
const updateTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  leader_id: z.string().uuid().nullable().optional(),
});

// PUT /api/dashboard/teams/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Validate ID parameter
      const validatedParams = await validateRequest(params, idParamsSchema);
      const teamId = validatedParams.id;

      // Check permissions
      const userRole = req.user?.profile.role;
      if (!["admin", "general_manager", "leader"].includes(userRole!)) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, updateTeamSchema);

      // Call existing team update action
      const result = await updateTeam({
        teamId,
        ...validatedData,
      });

      if (result.error) {
        const errorMessage = typeof result.error === "string" ? result.error : "Failed to update team";

        return NextResponse.json(errorResponse(errorMessage), { status: 400 });
      }

      return NextResponse.json(successResponse("Team updated successfully", result.data), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// DELETE /api/dashboard/teams/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Validate ID parameter
      const validatedParams = await validateRequest(params, idParamsSchema);
      const teamId = validatedParams.id;

      // Check permissions - only admin and GM can delete teams
      const userRole = req.user?.profile.role;
      if (!["admin", "general_manager"].includes(userRole!)) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Call existing team deletion action
      const result = await deleteTeam({ teamId });

      if (result.error) {
        const errorMessage = typeof result.error === "string" ? result.error : "Failed to delete team";

        return NextResponse.json(errorResponse(errorMessage), { status: 400 });
      }

      return NextResponse.json(successResponse("Team deleted successfully"), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
