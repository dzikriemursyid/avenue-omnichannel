// Team Management Hooks
import { useEffect } from "react";
import { useApi } from "./use-api";
import { teamsApi, PaginationParams } from "@/lib/api";

export function useTeams(params?: PaginationParams) {
  const { data, error, loading, execute } = useApi(teamsApi.list);

  useEffect(() => {
    execute(params);
  }, [execute, params?.page, params?.limit, params?.sort, params?.order]);

  return {
    teams: data?.teams || [],
    pagination: data?.pagination || null,
    error,
    loading,
    refetch: () => execute(params),
  };
}

export function useTeam(id: string) {
  const { data, error, loading, execute } = useApi(teamsApi.get);

  useEffect(() => {
    if (id) {
      execute(id);
    }
  }, [execute, id]);

  return {
    team: data?.team || null,
    error,
    loading,
    refetch: () => execute(id),
  };
}

export function useCreateTeam() {
  return useApi(teamsApi.create, {
    showSuccessToast: true,
    successMessage: "Team created successfully!",
  });
}

export function useUpdateTeam() {
  return useApi(teamsApi.update, {
    showSuccessToast: true,
    successMessage: "Team updated successfully!",
  });
}

export function useDeleteTeam() {
  return useApi(teamsApi.delete, {
    showSuccessToast: true,
    successMessage: "Team deleted successfully!",
  });
}
