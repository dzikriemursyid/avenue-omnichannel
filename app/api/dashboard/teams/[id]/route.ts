// Quick Fix Team API Route with Relaxed Validation
// File: app/api/dashboard/teams/[id]/route.ts (replace existing)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deleteTeam } from "@/lib/actions/team-management";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { revalidatePath } from "next/cache";

// RELAXED validation schemas for debugging
const updateTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  leader_id: z.string().nullable().optional(), // Removed strict UUID validation
});

// Relaxed ID validation - just check it's a string
const relaxedIdSchema = z.object({
  id: z.string().min(1, "ID is required"), // Removed UUID validation temporarily
});

// PUT /api/dashboard/teams/[id] - QUICK FIX VERSION
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      console.log("=== QUICK FIX UPDATE TEAM ===");
      console.log("1. Raw params received:", params);
      console.log("2. Team ID from params:", params.id);
      console.log("3. Team ID type:", typeof params.id);
      console.log("4. Team ID length:", params.id?.length);

      // Check if it looks like a UUID (basic pattern)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUUID = uuidPattern.test(params.id);
      console.log("5. Is valid UUID pattern?", isValidUUID);

      if (!isValidUUID) {
        console.log("6. ❌ Invalid UUID format detected");
        return NextResponse.json(errorResponse(`Invalid team ID format: "${params.id}". Expected UUID format.`), { status: 400 });
      }

      // Use relaxed validation
      const validatedParams = relaxedIdSchema.parse(params);
      const teamId = validatedParams.id;

      console.log("7. ✅ Params validation passed");

      // Check permissions
      const userRole = req.user?.profile.role;
      const userId = req.user?.id;

      console.log("8. User info:", { userRole, userId });

      if (!["admin", "general_manager", "leader"].includes(userRole!)) {
        console.log("8. ❌ Permission denied");
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      console.log("8. ✅ Permission granted");

      // Parse request body
      const body = await req.json();
      console.log("9. Request body:", body);

      const validatedData = updateTeamSchema.parse(body);
      console.log("10. Validated data:", validatedData);

      // Create Supabase client
      const supabase = await createClient();

      // Check team exists
      const { data: currentTeam, error: teamFetchError } = await supabase.from("teams").select("id, name, leader_id").eq("id", teamId).single();

      if (teamFetchError || !currentTeam) {
        console.error("11. ❌ Team not found:", teamFetchError);
        return NextResponse.json(errorResponse("Team not found"), { status: 404 });
      }

      console.log("11. ✅ Team found:", currentTeam);

      // Leader permission check
      if (userRole === "leader" && currentTeam.leader_id !== userId) {
        console.log("11. ❌ Leader permission denied");
        return NextResponse.json(errorResponse("Cannot update this team"), { status: 403 });
      }

      // Handle leader update
      if (validatedData.leader_id !== undefined) {
        console.log("12. Processing leader update...");

        if (validatedData.leader_id) {
          // Check if leader_id is valid UUID
          if (!uuidPattern.test(validatedData.leader_id)) {
            return NextResponse.json(errorResponse(`Invalid user ID format: "${validatedData.leader_id}"`), { status: 400 });
          }

          // Verify new leader exists and is in team
          const { data: newLeaderProfile, error: profileError } = await supabase.from("profiles").select("id, team_id, role, full_name").eq("id", validatedData.leader_id).single();

          if (profileError || !newLeaderProfile) {
            console.error("12. ❌ New leader not found:", profileError);
            return NextResponse.json(errorResponse("Selected user not found"), { status: 404 });
          }

          console.log("12. New leader profile:", newLeaderProfile);

          if (newLeaderProfile.team_id !== teamId) {
            return NextResponse.json(errorResponse("User must be a member of the team to become leader"), { status: 400 });
          }

          // Promote to leader if needed
          if (newLeaderProfile.role === "agent") {
            const { error: roleUpdateError } = await supabase.from("profiles").update({ role: "leader" }).eq("id", validatedData.leader_id);

            if (roleUpdateError) {
              console.error("12. ❌ Role update error:", roleUpdateError);
              return NextResponse.json(errorResponse("Failed to update user role"), { status: 500 });
            }
          }

          // Demote previous leader
          if (currentTeam.leader_id && currentTeam.leader_id !== validatedData.leader_id) {
            await supabase.from("profiles").update({ role: "agent" }).eq("id", currentTeam.leader_id);
          }
        }
      }

      // Prepare update data
      const updateData: any = { updated_at: new Date().toISOString() };

      if (validatedData.name !== undefined) updateData.name = validatedData.name;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active;
      if (validatedData.leader_id !== undefined) updateData.leader_id = validatedData.leader_id;

      console.log("13. Update data:", updateData);

      // Update team
      const { data: updatedTeam, error: updateError } = await supabase.from("teams").update(updateData).eq("id", teamId).select().single();

      if (updateError) {
        console.error("14. ❌ Database update error:", updateError);
        return NextResponse.json(errorResponse("Failed to update team"), { status: 500 });
      }

      console.log("14. ✅ Update successful:", updatedTeam);

      revalidatePath("/dashboard/teams");

      return NextResponse.json(successResponse("Team updated successfully", { team: updatedTeam }), { status: 200 });
    } catch (error) {
      console.error("15. ❌ Unexpected error:", error);
      return handleApiError(error);
    }
  })(request);
}

// DELETE - Keep simple for now
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const teamId = params.id;

      // Check permissions
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
