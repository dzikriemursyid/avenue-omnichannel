"use server";

import { createServerActionClient, type ActionResult } from "@/lib/supabase/server-actions";
import { redirect } from "next/navigation";

export async function signIn(prevState: any, formData: FormData): Promise<ActionResult> {
  if (!formData) {
    return { success: false, message: "Form data is missing" };
  }

  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { success: false, message: "Email and password are required" };
  }

  const supabase = await createServerActionClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: "Welcome back! You have successfully signed in." };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }
}

export async function signOut(prevState?: any, formData?: FormData): Promise<ActionResult> {
  const supabase = await createServerActionClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: "You have been signed out successfully. See you next time!" };
  } catch (error) {
    console.error("Sign out error:", error);
    return { success: false, message: "An error occurred while signing out. Please try again." };
  }
}
