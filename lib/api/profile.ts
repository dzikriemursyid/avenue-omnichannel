// Profile API Service
import apiClient from "./client";
import { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface UpdateProfileRequest {
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
}

// API returns Profile object directly in data field
export type ProfileResponse = Profile;

export const profileApi = {
  get: async () => {
    return apiClient.get<ProfileResponse>("/dashboard/profile");
  },

  update: async (data: UpdateProfileRequest) => {
    return apiClient.put<ProfileResponse>("/dashboard/profile", data);
  },
};
