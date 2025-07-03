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
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id: teamId } = await params;
      // Check if it looks like a UUID (basic pattern)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUUID = uuidPattern.test(teamId);

      if (!isValidUUID) {
        return NextResponse.json(errorResponse(`Invalid team ID format: "${teamId}". Expected UUID format.`), { status: 400 });
      }

      // Use relaxed validation
      const validatedParams = relaxedIdSchema.parse({ id: teamId });
      const validatedTeamId = validatedParams.id;

      // Check permissions
      const userRole = req.user?.profile.role;
      const userId = req.user?.id;

      if (!["admin", "general_manager", "leader"].includes(userRole!)) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse request body
      const body = await req.json();
      const validatedData = updateTeamSchema.parse(body);

      // Create Supabase client
      const supabase = await createClient();

      // Check team exists
      const { data: currentTeam, error: teamFetchError } = await supabase.from("teams").select("id, name, leader_id").eq("id", validatedTeamId).single();

      if (teamFetchError || !currentTeam) {
        console.error("Team not found:", teamFetchError);
        return NextResponse.json(errorResponse("Team not found"), { status: 404 });
      }

      // Leader permission check
      if (userRole === "leader" && currentTeam.leader_id !== userId) {
        return NextResponse.json(errorResponse("Cannot update this team"), { status: 403 });
      }

      // Handle leader update
      if (validatedData.leader_id !== undefined) {
        if (validatedData.leader_id) {
          // Check if leader_id is valid UUID
          if (!uuidPattern.test(validatedData.leader_id)) {
            return NextResponse.json(errorResponse(`Invalid user ID format: "${validatedData.leader_id}"`), { status: 400 });
          }

          // Verify new leader exists and is in team
          const { data: newLeaderProfile, error: profileError } = await supabase.from("profiles").select("id, team_id, role, full_name").eq("id", validatedData.leader_id).single();

          if (profileError || !newLeaderProfile) {
            console.error("New leader not found:", profileError);
            return NextResponse.json(errorResponse("Selected user not found"), { status: 404 });
          }

          if (newLeaderProfile.team_id !== validatedTeamId) {
            return NextResponse.json(errorResponse("User must be a member of the team to become leader"), { status: 400 });
          }

          // Promote to leader if needed
          if (newLeaderProfile.role === "agent") {
            const { error: roleUpdateError } = await supabase.from("profiles").update({ role: "leader" }).eq("id", validatedData.leader_id);

            if (roleUpdateError) {
              console.error("Role update error:", roleUpdateError);
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

      // Update team
      const { data: updatedTeam, error: updateError } = await supabase.from("teams").update(updateData).eq("id", validatedTeamId).select().single();

      if (updateError) {
        console.error("Database update error:", updateError);
        return NextResponse.json(errorResponse("Failed to update team"), { status: 500 });
      }

      revalidatePath("/dashboard/teams");

      return NextResponse.json(successResponse("Team updated successfully", { team: updatedTeam }), { status: 200 });
    } catch (error) {
      console.error("Unexpected error:", error);
      return handleApiError(error);
    }
  })(request);
}

// DELETE - Keep simple for now
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id: teamId } = await params;

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
