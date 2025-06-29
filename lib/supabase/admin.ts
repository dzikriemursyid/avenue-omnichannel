import { createClient } from "./server"
import type { UserProfile } from "./profiles"

export interface Team {
  id: string
  name: string
  description?: string
  leader_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = createClient()

  const { data: users, error } = await supabase
    .from("profiles")
    .select(`
      *,
      teams:team_id (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
    return []
  }

  return users || []
}

export async function getAllTeams(): Promise<Team[]> {
  const supabase = createClient()

  const { data: teams, error } = await supabase.from("teams").select("*").order("name")

  if (error) {
    console.error("Error fetching teams:", error)
    return []
  }

  return teams || []
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "full_name" | "role" | "team_id" | "is_active">>,
): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId)

  if (error) {
    console.error("Error updating user profile:", error)
    return false
  }

  return true
}

export async function deleteUser(userId: string): Promise<boolean> {
  const supabase = createClient()

  // First delete from profiles (this will cascade to auth.users due to foreign key)
  const { error } = await supabase.from("profiles").delete().eq("id", userId)

  if (error) {
    console.error("Error deleting user:", error)
    return false
  }

  return true
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createClient()

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", userId).single()

  if (error || !profile) {
    return false
  }

  return profile.role === "admin"
}
