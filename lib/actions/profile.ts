"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserProfile, updateUserProfile, uploadAvatar, deleteAvatar } from "@/lib/supabase/profiles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone_number: z.string().optional(),
});

export type ProfileActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function updateProfile(formData: FormData): Promise<ProfileActionResult> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const rawData = {
      full_name: formData.get("full_name") as string,
      phone_number: (formData.get("phone_number") as string) || null,
    };

    const validation = UpdateProfileSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        message: "Invalid data",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { full_name, phone_number } = validation.data;

    // Update profile
    const updatedProfile = await updateUserProfile(user.id, {
      full_name,
      phone_number,
    });

    if (!updatedProfile) {
      return { success: false, message: "Failed to update profile" };
    }

    revalidatePath("/dashboard/profile");
    return { success: true, message: "Profile updated successfully" };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, message: "System error occurred" };
  }
}

export async function uploadProfileAvatar(formData: FormData): Promise<ProfileActionResult> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const file = formData.get("avatar") as File;
    if (!file) {
      return { success: false, message: "No file provided" };
    }

    // Upload avatar
    const avatarUrl = await uploadAvatar(user.id, file);
    if (!avatarUrl) {
      return { success: false, message: "Failed to upload avatar" };
    }

    // Get current profile to check if there's an existing avatar
    const currentProfile = await getUserProfile(user.id);
    if (currentProfile?.avatar_url) {
      // Delete old avatar
      await deleteAvatar(user.id, currentProfile.avatar_url);
    }

    // Update profile with new avatar URL
    const updatedProfile = await updateUserProfile(user.id, {
      avatar_url: avatarUrl,
    });

    if (!updatedProfile) {
      return { success: false, message: "Failed to update profile with avatar" };
    }

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard"); // Revalidate dashboard for sidebar avatar
    return { success: true, message: "Avatar uploaded successfully" };
  } catch (error) {
    console.error("Upload avatar error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "System error occurred" };
  }
}

export async function deleteProfileAvatar(): Promise<ProfileActionResult> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    // Get current profile
    const currentProfile = await getUserProfile(user.id);
    if (!currentProfile?.avatar_url) {
      return { success: false, message: "No avatar to delete" };
    }

    // Delete avatar from storage
    const deleted = await deleteAvatar(user.id, currentProfile.avatar_url);
    if (!deleted) {
      return { success: false, message: "Failed to delete avatar" };
    }

    // Update profile to remove avatar URL
    const updatedProfile = await updateUserProfile(user.id, {
      avatar_url: null,
    });

    if (!updatedProfile) {
      return { success: false, message: "Failed to update profile" };
    }

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard"); // Revalidate dashboard for sidebar avatar
    return { success: true, message: "Avatar deleted successfully" };
  } catch (error) {
    console.error("Delete avatar error:", error);
    return { success: false, message: "System error occurred" };
  }
}
