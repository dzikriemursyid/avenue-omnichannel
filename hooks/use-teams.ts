// Extended Team Management Hooks
// File: hooks/use-teams.ts (replace existing)
import { useEffect } from "react";
import { useApi } from "./use-api";
import { teamsApi, PaginationParams } from "@/lib/api";

// Basic team hooks (existing)
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

// NEW: Extended hooks for member management
// These will use temporary direct fetch until API routes are created

export function useAddTeamMember() {
  const { execute, loading, error } = useApi(
    async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const response = await fetch(`/api/dashboard/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to add team member");
      }

      return result;
    },
    {
      showSuccessToast: true,
      successMessage: "Member added successfully!",
    }
  );

  return { execute, loading, error };
}

export function useRemoveTeamMember() {
  const { execute, loading, error } = useApi(
    async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const response = await fetch(`/api/dashboard/teams/${teamId}/members/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to remove team member");
      }

      return result;
    },
    {
      showSuccessToast: true,
      successMessage: "Member removed successfully!",
    }
  );

  return { execute, loading, error };
}

export function useAvailableUsers(teamId: string) {
  const { data, error, loading, execute } = useApi(async () => {
    const response = await fetch(`/api/dashboard/teams/${teamId}/available-users`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to load available users");
    }

    return result;
  });

  useEffect(() => {
    if (teamId) {
      execute();
    }
  }, [execute, teamId]);

  return {
    users: data?.users || [],
    error,
    loading,
    refetch: execute,
  };
}

export function useDemoteTeamLeader() {
  const { execute, loading, error } = useApi(
    async ({ teamId }: { teamId: string }) => {
      const response = await fetch(`/api/dashboard/teams/${teamId}/demote-leader`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to demote team leader");
      }

      return result;
    },
    {
      showSuccessToast: true,
      successMessage: "Leader demoted successfully!",
    }
  );

  return { execute, loading, error };
}
