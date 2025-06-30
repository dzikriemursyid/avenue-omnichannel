import { createClient } from "./server";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "general_manager" | "leader" | "agent";
  team_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  phone_number: string | null;
  avatar_url: string | null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return profile;
}

export async function createUserProfile(userId: string, email: string, fullName: string, role: UserProfile["role"] = "agent"): Promise<UserProfile | null> {
  const supabase = await createClient();

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
    .single();

  if (error) {
    console.error("Error creating user profile:", error);
    return null;
  }

  return profile;
}

export async function getOrCreateUserProfile(userId: string, email: string, fullName?: string): Promise<UserProfile | null> {
  // First try to get existing profile
  let profile = await getUserProfile(userId);

  if (!profile && fullName) {
    // Create profile if it doesn't exist
    profile = await createUserProfile(userId, email, fullName);
  }

  return profile;
}

export async function updateUserProfile(userId: string, updates: Partial<Pick<UserProfile, "full_name" | "phone_number" | "avatar_url">>): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single();

  if (error) {
    console.error("Error updating user profile:", error);
    return null;
  }

  return profile;
}

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const supabase = await createClient();

  // Check file size (2MB limit)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File size must be less than 2MB");
  }

  // Check file type
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  // Generate unique filename with user folder structure
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage.from("avatars").upload(fileName, file, {
    cacheControl: "3600",
    upsert: true, // Allow overwriting existing files
  });

  if (error) {
    console.error("Error uploading avatar:", error);
    return null;
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  return publicUrl;
}

export async function deleteAvatar(userId: string, avatarUrl: string): Promise<boolean> {
  const supabase = await createClient();

  // Extract filename from URL
  const urlParts = avatarUrl.split("/");
  const fileName = urlParts[urlParts.length - 1];
  const fullPath = `${userId}/${fileName}`;

  const { error } = await supabase.storage.from("avatars").remove([fullPath]);

  if (error) {
    console.error("Error deleting avatar:", error);
    return false;
  }

  return true;
}
