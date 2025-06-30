"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profiles";
import { hasPermission } from "@/lib/supabase/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Schema definitions
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

const updateTeamSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  leader_id: z.string().uuid().nullable().optional(),
});

const addTeamMemberSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
});

const removeTeamMemberSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
});

const deleteTeamSchema = z.object({
  teamId: z.string().uuid(),
});

// Create a new team
export async function createTeam(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const profile = await getUserProfile(user.id);

  // Only admin and GM can create teams
  if (!profile || !["admin", "general_manager"].includes(profile.role)) {
    return { error: "You don't have permission to create teams" };
  }

  const result = createTeamSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    is_active: formData.get("is_active") === "true",
  });

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: result.data.name,
      description: result.data.description || null,
      is_active: result.data.is_active,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating team:", error);
    return { error: "Failed to create team" };
  }

  revalidatePath("/dashboard/teams");
  return { data };
}

// Update team details
export async function updateTeam(values: z.infer<typeof updateTeamSchema>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const profile = await getUserProfile(user.id);

  // Check permissions
  if (!profile) {
    return { error: "Profile not found" };
  }

  // Get team details to check if user is team leader
  const { data: team } = await supabase.from("teams").select("leader_id").eq("id", values.teamId).single();

  // Admin and GM can update any team, leaders can update their own team
  const canUpdate = ["admin", "general_manager"].includes(profile.role) || (profile.role === "leader" && team?.leader_id === user.id);

  if (!canUpdate) {
    return { error: "You don't have permission to update this team" };
  }

  const result = updateTeamSchema.safeParse(values);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const updateData: any = {};
  if (result.data.name !== undefined) updateData.name = result.data.name;
  if (result.data.description !== undefined) updateData.description = result.data.description;
  if (result.data.is_active !== undefined) updateData.is_active = result.data.is_active;
  if (result.data.leader_id !== undefined) updateData.leader_id = result.data.leader_id;

  const { data, error } = await supabase.from("teams").update(updateData).eq("id", values.teamId).select().single();

  if (error) {
    console.error("Error updating team:", error);
    return { error: "Failed to update team" };
  }

  revalidatePath("/dashboard/teams");
  return { data };
}

// Add member to team
export async function addTeamMember(values: z.infer<typeof addTeamMemberSchema>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const profile = await getUserProfile(user.id);

  if (!profile) {
    return { error: "Profile not found" };
  }

  // Get team details
  const { data: team } = await supabase.from("teams").select("leader_id").eq("id", values.teamId).single();

  // Admin, GM can add to any team, leaders can add to their team
  const canAdd = ["admin", "general_manager"].includes(profile.role) || (profile.role === "leader" && team?.leader_id === user.id);

  if (!canAdd) {
    return { error: "You don't have permission to add members to this team" };
  }

  const result = addTeamMemberSchema.safeParse(values);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  // Update user's team_id
  const { error } = await supabase.from("profiles").update({ team_id: values.teamId }).eq("id", values.userId);

  if (error) {
    console.error("Error adding team member:", error);
    return { error: "Failed to add team member" };
  }

  revalidatePath("/dashboard/teams");
  return { success: true };
}

// Remove member from team
export async function removeTeamMember(values: z.infer<typeof removeTeamMemberSchema>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const profile = await getUserProfile(user.id);

  if (!profile) {
    return { error: "Profile not found" };
  }

  // Get team details
  const { data: team } = await supabase.from("teams").select("leader_id").eq("id", values.teamId).single();

  // Admin, GM can remove from any team, leaders can remove from their team
  const canRemove = ["admin", "general_manager"].includes(profile.role) || (profile.role === "leader" && team?.leader_id === user.id);

  if (!canRemove) {
    return { error: "You don't have permission to remove members from this team" };
  }

  const result = removeTeamMemberSchema.safeParse(values);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  // Check if the user being removed is the team leader
  if (team?.leader_id === values.userId) {
    return { error: "Cannot remove team leader. Please assign a new leader first." };
  }

  // Update user's team_id to null
  const { error } = await supabase.from("profiles").update({ team_id: null }).eq("id", values.userId);

  if (error) {
    console.error("Error removing team member:", error);
    return { error: "Failed to remove team member" };
  }

  revalidatePath("/dashboard/teams");
  return { success: true };
}

// Delete team
export async function deleteTeam(values: z.infer<typeof deleteTeamSchema>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const profile = await getUserProfile(user.id);

  // Only admin and GM can delete teams
  if (!profile || !["admin", "general_manager"].includes(profile.role)) {
    return { error: "You don't have permission to delete teams" };
  }

  const result = deleteTeamSchema.safeParse(values);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  // First, remove all team members
  const { error: updateError } = await supabase.from("profiles").update({ team_id: null }).eq("team_id", values.teamId);

  if (updateError) {
    console.error("Error removing team members:", updateError);
    return { error: "Failed to remove team members" };
  }

  // Then delete the team
  const { error } = await supabase.from("teams").delete().eq("id", values.teamId);

  if (error) {
    console.error("Error deleting team:", error);
    return { error: "Failed to delete team" };
  }

  revalidatePath("/dashboard/teams");
  return { success: true };
}

// Get available users for team assignment
export async function getAvailableUsersForTeam(teamId?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", users: [] };
  }

  const profile = await getUserProfile(user.id);

  if (!profile) {
    return { error: "Profile not found", users: [] };
  }

  // Get users without a team or in the specified team
  let query = supabase.from("profiles").select("id, full_name, email, role, team_id").neq("role", "admin"); // Don't include admins in team assignment

  if (teamId) {
    // Include users already in this team and users without a team
    query = query.or(`team_id.is.null,team_id.eq.${teamId}`);
  } else {
    // Only users without a team
    query = query.is("team_id", null);
  }

  const { data: users, error } = await query.order("full_name");

  if (error) {
    console.error("Error fetching available users:", error);
    return { error: "Failed to fetch users", users: [] };
  }

  return { users: users || [] };
}
