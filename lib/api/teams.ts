// Updated Teams API Service with Member Management
// File: lib/api/teams.ts (replace existing)
import apiClient from "./client";
import { Database } from "@/lib/database.types";
import type { Team } from "@/lib/supabase/teams";

// Basic database team type for create/update operations
type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface CreateTeamRequest {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  leader_id?: string;
  is_active?: boolean;
}

export interface TeamsListResponse {
  teams: Team[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TeamResponse {
  team: TeamRow;
}

export interface TeamMembersResponse {
  team: Team;
}

export interface AvailableUsersResponse {
  users: ProfileRow[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

// Member management interfaces
export interface AddMemberRequest {
  userId: string;
}

export interface UpdateLeaderRequest {
  leader_id: string | null;
}

export const teamsApi = {
  // Basic CRUD operations
  list: async (params?: PaginationParams) => {
    return apiClient.get<TeamsListResponse>("/dashboard/teams", params as any);
  },

  get: async (id: string) => {
    return apiClient.get<TeamResponse>(`/dashboard/teams/${id}`);
  },

  create: async (data: CreateTeamRequest) => {
    return apiClient.post<TeamResponse>("/dashboard/teams", data);
  },

  update: async (id: string, data: UpdateTeamRequest) => {
    return apiClient.put<TeamResponse>(`/dashboard/teams/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/dashboard/teams/${id}`);
  },

  // Member management operations
  getMembers: async (teamId: string) => {
    return apiClient.get<TeamMembersResponse>(`/dashboard/teams/${teamId}/members`);
  },

  addMember: async (teamId: string, data: AddMemberRequest) => {
    return apiClient.post<{ message: string }>(`/dashboard/teams/${teamId}/members`, data);
  },

  removeMember: async (teamId: string, userId: string) => {
    return apiClient.delete<{ message: string }>(`/dashboard/teams/${teamId}/members/${userId}`);
  },

  getAvailableUsers: async (teamId: string) => {
    return apiClient.get<AvailableUsersResponse>(`/dashboard/teams/${teamId}/available-users`);
  },

  // Leader management operations
  updateLeader: async (teamId: string, data: UpdateLeaderRequest) => {
    return apiClient.put<{ message: string }>(`/dashboard/teams/${teamId}/leader`, data);
  },

  demoteLeader: async (teamId: string) => {
    return apiClient.delete<{ message: string }>(`/dashboard/teams/${teamId}/leader`);
  },
};
