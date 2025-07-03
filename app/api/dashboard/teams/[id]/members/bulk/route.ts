import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { revalidatePath } from "next/cache";

const bulkMembersSchema = z.object({
  userIds: z.array(z.string().uuid("Invalid user ID")).min(1, "At least one user must be selected"),
});

// POST /api/dashboard/teams/[id]/members/bulk - Bulk add members
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id: teamId } = await params;
      const userRole = req.user?.profile.role;
      const userId = req.user?.id;
      const body = await req.json();
      const validated = bulkMembersSchema.safeParse(body);
      if (!validated.success) {
        return NextResponse.json(errorResponse("Invalid request", validated.error.flatten().fieldErrors), { status: 400 });
      }
      const userIds = validated.data.userIds;
      const supabase = await createClient();
      // Get team details to check permissions
      const { data: team, error: teamError } = await supabase.from("teams").select("leader_id").eq("id", teamId).single();
      if (teamError || !team) {
        return NextResponse.json(errorResponse("Team not found"), { status: 404 });
      }
      // Check permissions - Admin, GM can add to any team, leaders can add to their team
      const canAdd = ["admin", "general_manager"].includes(userRole!) || (userRole === "leader" && team.leader_id === userId);
      if (!canAdd) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }
      // Check if any user is already in a team
      const { data: existingProfiles } = await supabase.from("profiles").select("id, team_id, full_name").in("id", userIds);
      const alreadyAssigned = (existingProfiles || []).filter((u: any) => u.team_id && u.team_id !== teamId);
      if (alreadyAssigned.length > 0) {
        return NextResponse.json(errorResponse(`Some users are already members of another team: ${alreadyAssigned.map((u: any) => u.full_name).join(", ")}`), { status: 400 });
      }
      // Bulk update
      const { error: updateError } = await supabase.from("profiles").update({ team_id: teamId, updated_at: new Date().toISOString() }).in("id", userIds);
      if (updateError) {
        console.error("Bulk add error:", updateError);
        return NextResponse.json(errorResponse("Failed to add team members"), { status: 500 });
      }
      revalidatePath("/dashboard/teams");
      return NextResponse.json(successResponse("Members added successfully", { count: userIds.length }), { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// DELETE /api/dashboard/teams/[id]/members/bulk - Bulk remove members
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id: teamId } = await params;
      const userRole = req.user?.profile.role;
      const currentUserId = req.user?.id;
      const body = await req.json();
      const validated = bulkMembersSchema.safeParse(body);
      if (!validated.success) {
        return NextResponse.json(errorResponse("Invalid request", validated.error.flatten().fieldErrors), { status: 400 });
      }
      const userIds = validated.data.userIds;
      const supabase = await createClient();
      // Get team details to check permissions
      const { data: team, error: teamError } = await supabase.from("teams").select("leader_id").eq("id", teamId).single();
      if (teamError || !team) {
        return NextResponse.json(errorResponse("Team not found"), { status: 404 });
      }
      // Check permissions - Admin, GM can remove from any team, leaders can remove from their team
      const canRemove = ["admin", "general_manager"].includes(userRole!) || (userRole === "leader" && team.leader_id === currentUserId);
      if (!canRemove) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }
      // Check if any user is the team leader
      if (team.leader_id && userIds.includes(team.leader_id)) {
        return NextResponse.json(errorResponse("Cannot remove team leader. Please assign a new leader first."), { status: 400 });
      }
      // Remove only users who are actually in this team
      const { data: profiles } = await supabase.from("profiles").select("id, team_id").in("id", userIds);
      const notInTeam = (profiles || []).filter((u: any) => u.team_id !== teamId);
      if (notInTeam.length > 0) {
        return NextResponse.json(errorResponse("Some users are not members of this team"), { status: 400 });
      }
      // Bulk update
      const { error: updateError } = await supabase.from("profiles").update({ team_id: null, updated_at: new Date().toISOString() }).in("id", userIds);
      if (updateError) {
        console.error("Bulk remove error:", updateError);
        return NextResponse.json(errorResponse("Failed to remove team members"), { status: 500 });
      }
      revalidatePath("/dashboard/teams");
      return NextResponse.json(successResponse("Members removed successfully", { count: userIds.length }), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
