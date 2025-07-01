// lib/actions/user-management.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { getUserProfile } from "@/lib/supabase/profiles";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// ===================================================
// SCHEMAS & TYPES
// ===================================================

const CreateUserSchema = z.object({
  email: z.string().email("Email tidak valid"),
  full_name: z.string().min(2, "Nama minimal 2 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["admin", "general_manager", "leader", "agent"]),
  team_id: z.string().nullable(),
});

const UpdateUserSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(2, "Nama minimal 2 karakter"),
  role: z.enum(["admin", "general_manager", "leader", "agent"]),
  team_id: z.string().nullable(),
  is_active: z.boolean(),
});

const CreateTeamSchema = z.object({
  name: z.string().min(2, "Nama team minimal 2 karakter"),
  description: z.string().optional(),
  leader_id: z.string().nullable(),
});

export type ActionResult<T = any> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
};

// ===================================================
// USER MANAGEMENT ACTIONS
// ===================================================

export async function createUser(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    console.log("Creating user with form data:", Object.fromEntries(formData.entries()));

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Tidak terautentikasi" };
    }

    // Check permissions
    const profile = await getUserProfile(user.id);
    if (!profile || profile.role !== "admin") {
      return { success: false, message: "Tidak memiliki izin untuk membuat user" };
    }

    // Validate input
    const rawData = {
      email: formData.get("email") as string,
      full_name: formData.get("full_name") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as string,
      team_id: (formData.get("team_id") as string) || null,
    };

    console.log("Raw data before validation:", rawData);

    const validation = CreateUserSchema.safeParse(rawData);
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return {
        success: false,
        message: "Data input tidak valid",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { email, full_name, password, role, team_id } = validation.data;

    // Convert "none" to null for team_id
    const finalTeamId = team_id === "none" ? null : team_id;

    console.log("Final data after validation:", { email, full_name, role, team_id: finalTeamId });

    // Check if email already exists
    const { data: existingUser } = await supabase.from("profiles").select("email").eq("email", email).single();

    if (existingUser) {
      return { success: false, message: "Email sudah terdaftar" };
    }

    // Use admin client for user creation
    const adminClient = createAdminClient();

    // Create auth user with metadata - the trigger will handle profile creation
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role,
        team_id: finalTeamId,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return {
        success: false,
        message: `Gagal membuat user: ${authError.message}`,
      };
    }

    // Wait a moment for the trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the profile was created by the trigger
    const { data: createdProfile, error: profileCheckError } = await supabase.from("profiles").select("*").eq("id", newUser.user.id).single();

    if (profileCheckError || !createdProfile) {
      console.error("Profile not created by trigger:", profileCheckError);

      // Fallback: Try to create profile manually using admin client
      try {
        const { error: manualProfileError } = await adminClient.from("profiles").insert({
          id: newUser.user.id,
          email,
          full_name,
          role,
          team_id: finalTeamId,
          is_active: true,
          phone_number: null,
          avatar_url: null,
        });

        if (manualProfileError) {
          console.error("Manual profile creation also failed:", manualProfileError);
          // Try to delete the auth user if profile creation failed
          await adminClient.auth.admin.deleteUser(newUser.user.id);
          return {
            success: false,
            message: "Gagal membuat profile user - trigger dan fallback tidak berfungsi",
          };
        }
      } catch (fallbackError) {
        console.error("Fallback profile creation error:", fallbackError);
        // Try to delete the auth user if profile creation failed
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        return {
          success: false,
          message: "Gagal membuat profile user - trigger dan fallback tidak berfungsi",
        };
      }
    }

    revalidatePath("/dashboard/users");
    return {
      success: true,
      message: `User ${full_name} berhasil dibuat dengan password.`,
      data: { user_id: newUser.user.id },
    };
  } catch (error) {
    console.error("Create user error:", error);
    return {
      success: false,
      message: "Terjadi kesalahan sistem",
    };
  }
}

export async function updateUser(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    console.log("Updating user with form data:", Object.fromEntries(formData.entries()));

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Tidak terautentikasi" };
    }

    // Validate input
    const rawData = {
      user_id: formData.get("user_id") as string,
      full_name: formData.get("full_name") as string,
      role: formData.get("role") as string,
      team_id: (formData.get("team_id") as string) || null,
      is_active: formData.has("is_active"), // Switch sends the field only when checked
    };

    console.log("Raw data before validation:", rawData);

    const validation = UpdateUserSchema.safeParse(rawData);
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return {
        success: false,
        message: "Data input tidak valid",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { user_id, full_name, role, team_id, is_active } = validation.data;

    // Convert "none" to null for team_id
    const finalTeamId = team_id === "none" ? null : team_id;

    console.log("Final data after validation:", { user_id, full_name, role, team_id: finalTeamId, is_active });

    // Check permissions using RLS + business logic
    const currentProfile = await getUserProfile(user.id);
    if (!currentProfile) {
      return { success: false, message: "Profile tidak ditemukan" };
    }

    // Get target user profile
    const { data: targetProfile } = await supabase.from("profiles").select("*").eq("id", user_id).single();

    if (!targetProfile) {
      return { success: false, message: "User tidak ditemukan" };
    }

    // Business logic for role updates
    if (currentProfile.role === "leader" && role !== "agent") {
      return { success: false, message: "Leader hanya bisa assign role agent" };
    }

    if (currentProfile.role === "general_manager" && role === "admin") {
      return { success: false, message: "GM tidak bisa assign role admin" };
    }

    // Update profile
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name,
        role,
        team_id: finalTeamId,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (error) {
      console.error("Update error:", error);
      return { success: false, message: "Gagal update user" };
    }

    revalidatePath("/dashboard/users");
    return {
      success: true,
      message: `User ${full_name} berhasil diupdate`,
    };
  } catch (error) {
    console.error("Update user error:", error);
    return { success: false, message: "Terjadi kesalahan sistem" };
  }
}

export async function deactivateUser(userId: string): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Tidak terautentikasi" };
    }

    // Check permissions
    const profile = await getUserProfile(user.id);
    if (!profile || !["admin", "general_manager"].includes(profile.role)) {
      return { success: false, message: "Tidak memiliki izin" };
    }

    // Cannot deactivate self
    if (userId === user.id) {
      return { success: false, message: "Tidak bisa menonaktifkan diri sendiri" };
    }

    // Update user status
    const { error } = await supabase
      .from("profiles")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return { success: false, message: "Gagal menonaktifkan user" };
    }

    revalidatePath("/dashboard/users");
    return { success: true, message: "User berhasil dinonaktifkan" };
  } catch (error) {
    console.error("Deactivate user error:", error);
    return { success: false, message: "Terjadi kesalahan sistem" };
  }
}

export async function updateUserPassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Tidak terautentikasi" };
    }

    // Check permissions - only admin can update passwords
    const profile = await getUserProfile(user.id);
    if (!profile || profile.role !== "admin") {
      return { success: false, message: "Hanya admin yang bisa update password" };
    }

    const userId = formData.get("user_id") as string;
    const newPassword = formData.get("password") as string;

    if (!userId || !newPassword) {
      return { success: false, message: "User ID dan password harus diisi" };
    }

    if (newPassword.length < 6) {
      return { success: false, message: "Password minimal 6 karakter" };
    }

    // Use admin client for password update
    const adminClient = createAdminClient();

    // Update user password directly
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Password update error:", error);
      return { success: false, message: "Gagal update password" };
    }

    return {
      success: true,
      message: "Password berhasil diupdate",
    };
  } catch (error) {
    console.error("Update password error:", error);
    return { success: false, message: "Terjadi kesalahan sistem" };
  }
}

// ===================================================
// TEAM MANAGEMENT ACTIONS
// ===================================================

export async function createTeam(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Tidak terautentikasi" };
    }

    // Check permissions
    const profile = await getUserProfile(user.id);
    if (!profile || !["admin", "general_manager"].includes(profile.role)) {
      return { success: false, message: "Tidak memiliki izin untuk membuat team" };
    }

    // Validate input
    const rawData = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      leader_id: (formData.get("leader_id") as string) || null,
    };

    const validation = CreateTeamSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        message: "Data input tidak valid",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { name, description, leader_id } = validation.data;

    // Convert "none" to null for leader_id
    const finalLeaderId = leader_id === "none" ? null : leader_id;

    // Check if team name already exists
    const { data: existingTeam } = await supabase.from("teams").select("name").eq("name", name).single();

    if (existingTeam) {
      return { success: false, message: "Nama team sudah ada" };
    }

    // Create team
    const { data: newTeam, error } = await supabase
      .from("teams")
      .insert({
        name,
        description,
        leader_id: finalLeaderId,
      })
      .select()
      .single();

    if (error) {
      console.error("Create team error:", error);
      return { success: false, message: "Gagal membuat team" };
    }

    // If leader assigned, update their team_id
    if (finalLeaderId) {
      await supabase.from("profiles").update({ team_id: newTeam.id }).eq("id", finalLeaderId);
    }

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/users");
    return {
      success: true,
      message: `Team ${name} berhasil dibuat`,
      data: { team_id: newTeam.id },
    };
  } catch (error) {
    console.error("Create team error:", error);
    return { success: false, message: "Terjadi kesalahan sistem" };
  }
}

export async function updateTeam(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Tidak terautentikasi" };
    }

    const team_id = formData.get("team_id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const leader_id = (formData.get("leader_id") as string) || null;

    // Validate required fields
    if (!team_id || !name) {
      return { success: false, message: "Team ID dan nama harus diisi" };
    }

    // Update team
    const { error } = await supabase
      .from("teams")
      .update({
        name,
        description,
        leader_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", team_id);

    if (error) {
      console.error("Update team error:", error);
      return { success: false, message: "Gagal update team" };
    }

    revalidatePath("/dashboard/teams");
    return { success: true, message: `Team ${name} berhasil diupdate` };
  } catch (error) {
    console.error("Update team error:", error);
    return { success: false, message: "Terjadi kesalahan sistem" };
  }
}

export async function assignUserToTeam(userId: string, teamId: string): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Tidak terautentikasi" };
    }

    // Update user's team assignment
    const { error } = await supabase
      .from("profiles")
      .update({
        team_id: teamId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Assign team error:", error);
      return { success: false, message: "Gagal assign user ke team" };
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/teams");
    return { success: true, message: "User berhasil di-assign ke team" };
  } catch (error) {
    console.error("Assign user to team error:", error);
    return { success: false, message: "Terjadi kesalahan sistem" };
  }
}

// ===================================================
// BULK OPERATIONS
// ===================================================

export async function bulkAssignTeam(userIds: string[], teamId: string): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Tidak terautentikasi" };
    }

    // Check permissions
    const profile = await getUserProfile(user.id);
    if (!profile || !["admin", "general_manager", "leader"].includes(profile.role)) {
      return { success: false, message: "Tidak memiliki izin" };
    }

    // Bulk update
    const { error } = await supabase
      .from("profiles")
      .update({
        team_id: teamId,
        updated_at: new Date().toISOString(),
      })
      .in("id", userIds);

    if (error) {
      console.error("Bulk assign error:", error);
      return { success: false, message: "Gagal bulk assign users" };
    }

    revalidatePath("/dashboard/users");
    return {
      success: true,
      message: `${userIds.length} users berhasil di-assign ke team`,
    };
  } catch (error) {
    console.error("Bulk assign error:", error);
    return { success: false, message: "Terjadi kesalahan sistem" };
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Tidak terautentikasi" };
    }

    // Check permissions - only admin can delete users
    const profile = await getUserProfile(user.id);
    if (!profile || profile.role !== "admin") {
      return { success: false, message: "Hanya admin yang bisa menghapus user" };
    }

    // Cannot delete self
    if (userId === user.id) {
      return { success: false, message: "Tidak bisa menghapus diri sendiri" };
    }

    // Use admin client for user deletion
    const adminClient = createAdminClient();

    // Delete from profiles table first (due to foreign key constraints)
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);

    if (profileError) {
      console.error("Profile deletion error:", profileError);
      return { success: false, message: "Gagal menghapus profile user" };
    }

    // Delete from auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("Auth deletion error:", authError);
      // Try to recreate the profile if auth deletion fails
      return { success: false, message: "Gagal menghapus user dari auth" };
    }

    revalidatePath("/dashboard/users");
    return { success: true, message: "User berhasil dihapus" };
  } catch (error) {
    console.error("Delete user error:", error);
    return { success: false, message: "Terjadi kesalahan sistem" };
  }
}
