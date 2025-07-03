// Remove Team Member API Route
// File: app/api/dashboard/teams/[id]/members/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { revalidatePath } from "next/cache";

// DELETE /api/dashboard/teams/[id]/members/[userId] - Remove team member
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id: teamId, userId: userIdToRemove } = await params;
      const userRole = req.user?.profile.role;
      const currentUserId = req.user?.id;

      const supabase = await createClient();

      // Get team details to check permissions
      const { data: team, error: teamError } = await supabase.from("teams").select("leader_id").eq("id", teamId).single();

      if (teamError || !team) {
        return NextResponse.json(errorResponse("Team not found"), { status: 404 });
      }

      // Check permissions - Admin, GM can remove from any team, leaders can remove from their team
      const canRemoveMember = ["admin", "general_manager"].includes(userRole!) || (userRole === "leader" && team.leader_id === currentUserId);

      if (!canRemoveMember) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Check if the user being removed is the team leader
      if (team.leader_id === userIdToRemove) {
        return NextResponse.json(errorResponse("Cannot remove team leader. Please assign a new leader first."), { status: 400 });
      }

      // Check if user is actually in this team
      const { data: userProfile } = await supabase.from("profiles").select("team_id, full_name").eq("id", userIdToRemove).single();

      if (userProfile?.team_id !== teamId) {
        return NextResponse.json(errorResponse("User is not a member of this team"), { status: 400 });
      }

      // Remove user from team
      const { error: updateError } = await supabase.from("profiles").update({ team_id: null }).eq("id", userIdToRemove);

      if (updateError) {
        console.error("Database error removing team member:", updateError);
        return NextResponse.json(errorResponse("Failed to remove team member"), { status: 500 });
      }

      // Revalidate cache
      revalidatePath("/dashboard/teams");

      return NextResponse.json(successResponse("Member removed successfully"));
    } catch (error) {
      console.error("Remove member error:", error);
      return handleApiError(error);
    }
  })(request);
}
