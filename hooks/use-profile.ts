// Profile Management Hooks
import { useEffect, useMemo } from "react";
import { useApi } from "./use-api";
import { profileApi, UpdateProfileRequest } from "@/lib/api";

export function useProfile() {
  // Memoize the API function to prevent recreation on every render
  const apiFunction = useMemo(() => {
    return profileApi.get;
  }, []);

  const { data, error, loading, execute } = useApi(apiFunction);

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
