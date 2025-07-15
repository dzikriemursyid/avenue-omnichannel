// Template API Client
import apiClient from "./client";
import { LocalTemplate } from "@/lib/twilio/templates";

export interface CreateTemplateRequest {
  name: string;
  template_id?: string;
  category: "marketing" | "utility" | "authentication";
  language_code: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
  button_config?: any;
  variables: string[];
}

export interface SyncTemplatesResponse {
  synced: number;
  deleted: number;
  errors: string[];
  message: string;
}

export const templateApi = {
  // List templates
  list: async () => {
    return apiClient.get<LocalTemplate[]>("/templates");
  },

  // Get single template
  get: async (id: string) => {
    return apiClient.get<LocalTemplate>(`/templates/${id}`);
  },

  // Create template
  create: async (data: CreateTemplateRequest) => {
    return apiClient.post<LocalTemplate>("/templates", data);
  },

  // Update template
  update: async (id: string, data: Partial<CreateTemplateRequest>) => {
    return apiClient.put<LocalTemplate>(`/templates/${id}`, data);
  },

  // Delete template
  delete: async (id: string) => {
    return apiClient.delete<void>(`/templates/${id}`);
  },

  // Sync templates from Twilio
  sync: async () => {
    return apiClient.post<SyncTemplatesResponse>("/templates/sync");
  },

  // Get templates from Twilio (direct fetch)
  fetchTwilio: async () => {
    return apiClient.get<any[]>("/templates/twilio");
  },
};
