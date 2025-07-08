// Users API Service
import apiClient from "./client";
import { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "general_manager" | "leader" | "agent";
  team_id?: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  role?: "admin" | "general_manager" | "leader" | "agent";
  team_id?: string;
  is_active?: boolean;
  phone_number?: string;
}

export interface UpdatePasswordRequest {
  password: string;
}

export interface UsersListResponse {
  users: Profile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserResponse {
  user: Profile;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

export const usersApi = {
  list: async (params?: PaginationParams) => {
    return apiClient.get<UsersListResponse>("/dashboard/users", params as any);
  },

  get: async (id: string) => {
    return apiClient.get<UserResponse>(`/dashboard/users/${id}`);
  },

  create: async (data: CreateUserRequest) => {
    return apiClient.post<UserResponse>("/dashboard/users", data);
  },

  update: async (id: string, data: UpdateUserRequest) => {
    return apiClient.put<UserResponse>(`/dashboard/users/${id}`, data);
  },

  updatePassword: async (id: string, data: UpdatePasswordRequest) => {
    return apiClient.put<{ message: string }>(`/dashboard/users/${id}/password`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/dashboard/users/${id}`);
  },
};
