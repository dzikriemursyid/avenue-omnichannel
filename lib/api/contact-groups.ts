// Contact Groups API Service
import apiClient from "./client";

export interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  contact_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactGroupsListResponse {
  data: ContactGroup[];
  message: string;
}

export interface ContactGroupResponse {
  data: ContactGroup;
  message: string;
}

export interface CreateContactGroupRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateContactGroupRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export const contactGroupsApi = {
  // Get all contact groups
  list: async () => {
    return apiClient.get<ContactGroupsListResponse>("/dashboard/contact-groups");
  },

  // Get a single contact group
  get: async (id: string) => {
    return apiClient.get<ContactGroupResponse>(`/dashboard/contact-groups/${id}`);
  },

  // Create a new contact group
  create: async (groupData: CreateContactGroupRequest) => {
    return apiClient.post<ContactGroupResponse>("/dashboard/contact-groups", groupData);
  },

  // Update a contact group
  update: async (id: string, groupData: UpdateContactGroupRequest) => {
    return apiClient.put<ContactGroupResponse>(`/dashboard/contact-groups/${id}`, groupData);
  },

  // Delete a contact group
  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/dashboard/contact-groups/${id}`);
  },

  // Get contacts by group
  getContactsByGroup: async (groupId: string, params?: { search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());

    const queryString = searchParams.toString();
    const url = `/dashboard/contact-groups/${groupId}/contacts${queryString ? `?${queryString}` : ""}`;

    return apiClient.get<any>(url);
  },
};
