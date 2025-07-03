// Complete Team Management Hooks
// File: hooks/use-teams.ts (replace existing)
import { useEffect, useState } from "react";
import { useApi } from "./use-api";
import { teamsApi, PaginationParams } from "@/lib/api";

// Basic team hooks
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

// Member management hooks
export function useTeamMembers(teamId: string) {
  const { data, error, loading, execute } = useApi(teamsApi.getMembers);

  useEffect(() => {
    if (teamId) {
      execute(teamId);
    }
  }, [execute, teamId]);

  return {
    team: data?.team || null,
    members: data?.team?.members || [],
    leader: data?.team?.leader || null,
    error,
    loading,
    refetch: () => execute(teamId),
  };
}

export function useAddTeamMember() {
  return useApi(teamsApi.addMember, {
    showSuccessToast: true,
    successMessage: "Member added successfully!",
  });
}

export function useRemoveTeamMember() {
  return useApi(teamsApi.removeMember, {
    showSuccessToast: true,
    successMessage: "Member removed successfully!",
  });
}

export function useAvailableUsers(teamId: string | null) {
  const { data, error, loading, execute } = useApi(teamsApi.getAvailableUsers);

  useEffect(() => {
    if (teamId) {
      execute(teamId);
    }
  }, [execute, teamId]);

  return {
    users: data?.users || [],
    error,
    loading,
    refetch: () => (teamId ? execute(teamId) : Promise.resolve()),
  };
}

// Leader management hooks
export function useUpdateTeamLeader() {
  return useApi(teamsApi.updateLeader, {
    showSuccessToast: true,
    successMessage: "Team leader updated successfully!",
  });
}

export function useDemoteTeamLeader() {
  return useApi(teamsApi.demoteLeader, {
    showSuccessToast: true,
    successMessage: "Leader demoted successfully!",
  });
}

// Bulk add team members hook
export function useBulkAddTeamMembers() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (teamId: string, userIds: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/teams/${teamId}/members/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add team members");
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add team members";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}

// Bulk remove team members hook
export function useBulkRemoveTeamMembers() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (teamId: string, userIds: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/teams/${teamId}/members/bulk`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove team members");
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to remove team members";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}
