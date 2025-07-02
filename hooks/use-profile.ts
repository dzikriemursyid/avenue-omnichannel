// Profile Management Hooks
import { useEffect } from "react";
import { useApi } from "./use-api";
import { profileApi, UpdateProfileRequest } from "@/lib/api";

export function useProfile() {
  const { data, error, loading, execute } = useApi(profileApi.get);

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    profile: data || null,
    error,
    loading,
    refetch: execute,
  };
}

export function useUpdateProfile() {
  return useApi(profileApi.update, {
    showSuccessToast: true,
    successMessage: "Profile updated successfully!",
  });
}
