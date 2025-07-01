"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const SetupProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function completeProfileSetup(formData: FormData) {
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
      phone: (formData.get("phone") as string) || undefined,
    };

    const validation = SetupProfileSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        message: "Invalid data",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { full_name, phone } = validation.data;

    // Create profile (if not exists via trigger)
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email!,
      full_name,
      role: user.user_metadata?.role || "agent",
      team_id: user.user_metadata?.team_id || null,
      is_active: true,
    });

    if (error) {
      console.error("Profile setup error:", error);
      return { success: false, message: "Failed to setup profile" };
    }

    // Update user metadata if phone provided
    if (phone) {
      await supabase.auth.updateUser({
        data: { phone },
      });
    }
  } catch (error) {
    console.error("Setup profile error:", error);
    return { success: false, message: "System error occurred" };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();

  try {
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const validation = SignInSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        message: "Invalid email or password",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { email, password } = validation.data;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);
      return {
        success: false,
        message: error.message || "Failed to sign in",
      };
    }

    if (data.user) {
      return { success: true, message: "Successfully signed in" };
    }

    return { success: false, message: "Sign in failed" };
  } catch (error) {
    console.error("Sign in error:", error);
    return { success: false, message: "An unexpected error occurred" };
  }
}
