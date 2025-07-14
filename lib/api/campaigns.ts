// Campaign API Client
import apiClient from "./client";

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: "draft" | "scheduled" | "running" | "completed" | "paused" | "failed";
  template_id: string;
  template_name?: string;
  target_segments: string[];
  schedule_type: "immediate" | "scheduled" | "recurring";
  scheduled_at?: string;
  recurring_config?: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Template info
  message_templates?: {
    id: string;
    name: string;
    category: string;
    status: string;
  };
  // Creator info
  profiles?: {
    id: string;
    name: string;
  };
  // Analytics
  campaign_analytics?: {
    total_sent: number;
    total_delivered: number;
    total_read: number;
    total_failed: number;
    delivery_rate: number;
    read_rate: number;
  };
  // Legacy fields for compatibility
  target_count?: number;
  sent_count?: number;
  delivered_count?: number;
  read_count?: number;
  failed_count?: number;
  delivery_rate?: number;
  read_rate?: number;
  analytics_updated_at?: string;
}

export interface SendCampaignRequest {
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface SendCampaignResponse {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  message: string;
  campaignId: string;
}

export interface CampaignsListResponse {
  campaigns: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export const campaignApi = {
  // List campaigns
  list: async (params?: { page?: number; limit?: number; status?: string }) => {
    return apiClient.get<CampaignsListResponse>("/dashboard/campaigns", params);
  },

  // Get single campaign
  get: async (id: string) => {
    return apiClient.get<Campaign>(`/dashboard/campaigns/${id}`);
  },

  // Create campaign
  create: async (data: Partial<Campaign>) => {
    return apiClient.post<Campaign>("/dashboard/campaigns", data);
  },

  // Update campaign
  update: async (id: string, data: Partial<Campaign>) => {
    return apiClient.put<Campaign>(`/dashboard/campaigns/${id}`, data);
  },

  // Delete campaign
  delete: async (id: string) => {
    return apiClient.delete<void>(`/dashboard/campaigns/${id}`);
  },

  // Send campaign
  send: async (id: string, options?: SendCampaignRequest) => {
    return apiClient.post<SendCampaignResponse>(`/campaigns/${id}/send`, options || {});
  },

  // Pause campaign
  pause: async (id: string) => {
    return apiClient.post<Campaign>(`/campaigns/${id}/pause`);
  },

  // Resume campaign
  resume: async (id: string) => {
    return apiClient.post<Campaign>(`/campaigns/${id}/resume`);
  },

  // Get campaign analytics
  analytics: async (id: string) => {
    return apiClient.get<any>(`/campaigns/${id}/analytics`);
  },
};
