// Teams API Service
import apiClient from "./client";
import { Database } from "@/lib/database.types";
import type { Team } from "@/lib/supabase/teams";

// Basic database team type for create/update operations
type TeamRow = Database["public"]["Tables"]["teams"]["Row"];

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

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export const teamsApi = {
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
};
