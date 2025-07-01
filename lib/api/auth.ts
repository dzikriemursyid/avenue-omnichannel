// Authentication API Service
import apiClient from "./client";
import { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  profile?: Profile;
  message: string;
}

export interface SetupProfileRequest {
  name: string;
  username: string;
  role: string;
  team_id?: string;
}

export interface SetupProfileResponse {
  profile: Profile;
}

export const authApi = {
  login: async (data: LoginRequest) => {
    return apiClient.post<LoginResponse>("/auth/login", data);
  },

  setupProfile: async (data: SetupProfileRequest) => {
    return apiClient.post<SetupProfileResponse>("/auth/setup-profile", data);
  },

  logout: async () => {
    // Since we're using Supabase auth, logout is handled client-side
    // This is a placeholder for any server-side cleanup if needed
    return { success: true, message: "Logged out successfully" };
  },
};
