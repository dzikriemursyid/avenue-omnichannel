import { createClient } from "./server"

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: "admin" | "general_manager" | "leader" | "agent"
  team_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient()

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return profile
}

export async function createUserProfile(
  userId: string,
  email: string,
  fullName: string,
  role: UserProfile["role"] = "agent",
): Promise<UserProfile | null> {
  const supabase = createClient()

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating user profile:", error)
    return null
  }

  return profile
}

export async function getOrCreateUserProfile(
  userId: string,
  email: string,
  fullName?: string,
): Promise<UserProfile | null> {
  // First try to get existing profile
  let profile = await getUserProfile(userId)

  if (!profile && fullName) {
    // Create profile if it doesn't exist
    profile = await createUserProfile(userId, email, fullName)
  }

  return profile
}
