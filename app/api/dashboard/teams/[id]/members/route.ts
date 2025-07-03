// Team Members Management API Route
// File: app/api/dashboard/teams/[id]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest } from "@/lib/utils/api-validation";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { revalidatePath } from "next/cache";

// Add member request schema
const addMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

// GET /api/dashboard/teams/[id]/members - Get team members
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id: teamId } = await params;
      const userRole = req.user?.profile.role;

      // Check permissions
      if (!["admin", "general_manager", "leader"].includes(userRole!)) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const supabase = await createClient();

      // Get team with members
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select(
          `
          *,
          members:profiles!profiles_team_id_fkey(
            id,
            email,
            full_name,
            role,
            is_active
          ),
          leader:profiles!teams_leader_id_fkey(
            id,
            email,
            full_name,
            role
          )
        `
        )
        .eq("id", teamId)
        .single();

      if (teamError || !team) {
        return NextResponse.json(errorResponse("Team not found"), { status: 404 });
      }

      // Check if leader can access this team
      if (userRole === "leader" && team.leader?.id !== req.user?.id) {
        return NextResponse.json(errorResponse("Access denied"), { status: 403 });
      }

      return NextResponse.json(successResponse("Team members retrieved successfully", { team }));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// POST /api/dashboard/teams/[id]/members - Add team member
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id: teamId } = await params;
      const userRole = req.user?.profile.role;
      const userId = req.user?.id;

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, addMemberSchema);

      const supabase = await createClient();

      // Get team details to check permissions
      const { data: team, error: teamError } = await supabase.from("teams").select("leader_id").eq("id", teamId).single();

      if (teamError || !team) {
        return NextResponse.json(errorResponse("Team not found"), { status: 404 });
      }

      // Check permissions - Admin, GM can add to any team, leaders can add to their team
      const canAddMember = ["admin", "general_manager"].includes(userRole!) || (userRole === "leader" && team.leader_id === userId);

      if (!canAddMember) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Check if user is already in a team
      const { data: existingProfile } = await supabase.from("profiles").select("team_id, full_name").eq("id", validatedData.userId).single();

      if (existingProfile?.team_id) {
        return NextResponse.json(errorResponse(`User is already a member of another team`), { status: 400 });
      }

      // Add user to team
      const { error: updateError } = await supabase.from("profiles").update({ team_id: teamId }).eq("id", validatedData.userId);

      if (updateError) {
        console.error("Database error adding team member:", updateError);
        return NextResponse.json(errorResponse("Failed to add team member"), { status: 500 });
      }

      // Revalidate cache
      revalidatePath("/dashboard/teams");

      return NextResponse.json(successResponse("Member added successfully"), { status: 201 });
    } catch (error) {
      console.error("Add member error:", error);
      return handleApiError(error);
    }
  })(request);
}
