// Authentication Hooks
import { useRouter } from "next/navigation";
import { useApi } from "./use-api";
import { authApi, LoginRequest, SetupProfileRequest } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export function useLogin() {
  const router = useRouter();
  const supabase = createClient();

  return useApi(authApi.login, {
    showSuccessToast: true,
    successMessage: "Login successful!",
    onSuccess: async (data) => {
      // After successful API login, refresh the session
      await supabase.auth.refreshSession();

      if (data.profile) {
        router.push("/dashboard");
      } else {
        router.push("/auth/setup-profile");
      }
    },
  });
}

export function useSetupProfile() {
  const router = useRouter();

  return useApi(authApi.setupProfile, {
    showSuccessToast: true,
    successMessage: "Profile setup complete!",
    onSuccess: () => {
      router.push("/dashboard");
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const supabase = createClient();

  return useApi(authApi.logout, {
    showSuccessToast: true,
    successMessage: "Logged out successfully",
    onSuccess: async () => {
      await supabase.auth.signOut();
      router.push("/auth/login");
    },
  });
}
