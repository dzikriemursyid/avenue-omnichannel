import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];

export async function getAllUsers(): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      teams:team_id (
        id,
        name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get users error:", error);
    return [];
  }

  return data || [];
}

export async function getAllTeams(): Promise<Team[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select(
      `
      *,
      leader:leader_id (
        id,
        full_name,
        email
      ),
      members:profiles!team_id (
        id,
        full_name,
        role,
        is_active
      )
    `
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get teams error:", error);
    return [];
  }

  return data || [];
}

export async function getUsersByTeam(teamId: string): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("profiles").select("*").eq("team_id", teamId).eq("is_active", true).order("role", { ascending: true });

  if (error) {
    console.error("Get team users error:", error);
    return [];
  }

  return data || [];
}

export async function getTeamLeaders(): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("profiles").select("*").eq("role", "leader").eq("is_active", true).order("full_name", { ascending: true });

  if (error) {
    console.error("Get team leaders error:", error);
    return [];
  }

  return data || [];
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).eq("role", "admin").single();

  if (error) {
    return false;
  }

  return !!data;
}

export async function canManageTeam(userId: string, teamId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: user } = await supabase.from("profiles").select("role, team_id").eq("id", userId).single();

  if (!user) return false;

  // Admin and GM can manage any team
  if (user.role === "admin" || user.role === "general_manager") {
    return true;
  }

  // Leaders can manage their own team
  if (user.role === "leader" && user.team_id === teamId) {
    return true;
  }

  return false;
}
