// Team Leader Management API Route
// File: app/api/dashboard/teams/[id]/leader/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest } from "@/lib/utils/api-validation";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { revalidatePath } from "next/cache";

// Update leader request schema
const updateLeaderSchema = z.object({
  leader_id: z.string().uuid("Invalid user ID").nullable(),
});

// PUT /api/dashboard/teams/[id]/leader - Update team leader
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const teamId = params.id;
      const userRole = req.user?.profile.role;
      const currentUserId = req.user?.id;

      console.log("=== UPDATE TEAM LEADER ===");
      console.log("1. Team ID:", teamId);
      console.log("2. User role:", userRole);

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, updateLeaderSchema);

      console.log("3. New leader ID:", validatedData.leader_id);

      const supabase = await createClient();

      // Get current team details
      const { data: team, error: teamError } = await supabase.from("teams").select("leader_id, name").eq("id", teamId).single();

      if (teamError || !team) {
        return NextResponse.json(errorResponse("Team not found"), { status: 404 });
      }

      // Check permissions - Admin, GM can update any team, leaders can update their team
      const canUpdateLeader = ["admin", "general_manager"].includes(userRole!) || (userRole === "leader" && team.leader_id === currentUserId);

      if (!canUpdateLeader) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // If setting a new leader, verify the user exists and is in the team
      if (validatedData.leader_id) {
        const { data: newLeaderProfile, error: profileError } = await supabase.from("profiles").select("id, team_id, role, full_name").eq("id", validatedData.leader_id).single();

        if (profileError || !newLeaderProfile) {
          return NextResponse.json(errorResponse("User not found"), { status: 404 });
        }

        // Check if user is in this team
        if (newLeaderProfile.team_id !== teamId) {
          return NextResponse.json(errorResponse("User must be a member of the team to become leader"), { status: 400 });
        }

        // Update user role to leader if they're currently an agent
        if (newLeaderProfile.role === "agent") {
          const { error: roleUpdateError } = await supabase.from("profiles").update({ role: "leader" }).eq("id", validatedData.leader_id);

          if (roleUpdateError) {
            console.error("4. Role update error:", roleUpdateError);
            return NextResponse.json(errorResponse("Failed to update user role"), { status: 500 });
          }
        }
      }

      // If there was a previous leader and we're setting a new one, demote the old leader
      if (team.leader_id && validatedData.leader_id && team.leader_id !== validatedData.leader_id) {
        const { error: demoteError } = await supabase.from("profiles").update({ role: "agent" }).eq("id", team.leader_id);

        if (demoteError) {
          console.error("5. Demote error:", demoteError);
          // Don't fail the request, just log the error
        }
      }

      // Update team leader
      const { error: updateError } = await supabase
        .from("teams")
        .update({
          leader_id: validatedData.leader_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId);

      if (updateError) {
        console.error("6. Team update error:", updateError);
        return NextResponse.json(errorResponse("Failed to update team leader"), { status: 500 });
      }

      console.log("7. Team leader updated successfully");

      // Revalidate cache
      revalidatePath("/dashboard/teams");

      const message = validatedData.leader_id ? "Team leader updated successfully" : "Team leader removed successfully";

      return NextResponse.json(successResponse(message));
    } catch (error) {
      console.error("Update team leader error:", error);
      return handleApiError(error);
    }
  })(request);
}

// DELETE /api/dashboard/teams/[id]/leader - Remove team leader (demote)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const teamId = params.id;
      const userRole = req.user?.profile.role;
      const currentUserId = req.user?.id;

      console.log("=== DEMOTE TEAM LEADER ===");
      console.log("1. Team ID:", teamId);

      const supabase = await createClient();

      // Get current team details
      const { data: team, error: teamError } = await supabase.from("teams").select("leader_id").eq("id", teamId).single();

      if (teamError || !team) {
        return NextResponse.json(errorResponse("Team not found"), { status: 404 });
      }

      if (!team.leader_id) {
        return NextResponse.json(errorResponse("Team has no leader to demote"), { status: 400 });
      }

      // Check permissions
      const canDemoteLeader = ["admin", "general_manager"].includes(userRole!) || (userRole === "leader" && team.leader_id === currentUserId);

      if (!canDemoteLeader) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Demote current leader to agent
      const { error: demoteError } = await supabase.from("profiles").update({ role: "agent" }).eq("id", team.leader_id);

      if (demoteError) {
        console.error("2. Demote error:", demoteError);
        return NextResponse.json(errorResponse("Failed to demote leader"), { status: 500 });
      }

      // Remove leader from team
      const { error: updateError } = await supabase
        .from("teams")
        .update({
          leader_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId);

      if (updateError) {
        console.error("3. Team update error:", updateError);
        return NextResponse.json(errorResponse("Failed to update team"), { status: 500 });
      }

      console.log("4. Leader demoted successfully");

      // Revalidate cache
      revalidatePath("/dashboard/teams");

      return NextResponse.json(successResponse("Leader demoted successfully"));
    } catch (error) {
      console.error("Demote leader error:", error);
      return handleApiError(error);
    }
  })(request);
}
