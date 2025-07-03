// Available Users for Team API Route
// File: app/api/dashboard/teams/[id]/available-users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";

// GET /api/dashboard/teams/[id]/available-users - Get users available for team assignment
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const teamId = params.id;
      const userRole = req.user?.profile.role;

      console.log("=== GET AVAILABLE USERS ===");
      console.log("1. Team ID:", teamId);
      console.log("2. User role:", userRole);

      // Check permissions
      if (!["admin", "general_manager", "leader"].includes(userRole!)) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const supabase = await createClient();

      // For leaders, verify they can manage this team
      if (userRole === "leader") {
        const { data: team } = await supabase.from("teams").select("leader_id").eq("id", teamId).single();

        if (team?.leader_id !== req.user?.id) {
          return NextResponse.json(errorResponse("Access denied"), { status: 403 });
        }
      }

      // Get users that are not assigned to any team
      // Exclude admins and general managers from team assignment
      const { data: availableUsers, error: usersError } = await supabase.from("profiles").select("id, email, full_name, role").is("team_id", null).in("role", ["leader", "agent"]).eq("is_active", true).order("full_name");

      if (usersError) {
        console.error("3. Database error:", usersError);
        return NextResponse.json(errorResponse("Failed to fetch available users"), { status: 500 });
      }

      console.log("4. Found available users:", availableUsers?.length || 0);

      return NextResponse.json(
        successResponse("Available users retrieved successfully", {
          users: availableUsers || [],
        })
      );
    } catch (error) {
      console.error("Get available users error:", error);
      return handleApiError(error);
    }
  })(request);
}
