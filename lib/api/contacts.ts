// Contacts API Service following the established pattern
import apiClient from "./client";

export interface Contact {
  id: string;
  phone_number: string;
  name: string | null;
  email: string | null;
  profile_picture_url: string | null;
  tags: string[] | null;
  custom_fields: Record<string, any>;
  group_id: string | null;
  group_name: string | null;
  last_interaction_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactsListResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  }

export interface ContactResponse {
  contact: Contact;
}

export interface CreateContactData {
  phone_number: string;
  name: string;
  email?: string;
  tags?: string[];
  group_id?: string;
  group_name?: string;
  custom_fields?: Record<string, any>;
}

export interface UpdateContactData {
  phone_number?: string;
  name?: string;
  email?: string;
  tags?: string[];
  group_id?: string;
  group_name?: string;
  custom_fields?: Record<string, any>;
}

export interface ContactsFilters {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

export const contactsApi = {
  // Basic CRUD operations
  list: async (params?: PaginationParams) => {
    return apiClient.get<ContactsListResponse>("/dashboard/contacts", params as any);
  },

  get: async (id: string) => {
    return apiClient.get<ContactResponse>(`/dashboard/contacts/${id}`);
  },

  create: async (data: CreateContactData) => {
    return apiClient.post<ContactResponse>("/dashboard/contacts", data);
  },

  update: async (id: string, data: UpdateContactData) => {
    return apiClient.put<ContactResponse>(`/dashboard/contacts/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/dashboard/contacts/${id}`);
  },
};

// Legacy exports for backward compatibility (will be deprecated)
export const getContacts = (filters: ContactsFilters = {}) => contactsApi.list(filters);
export const getContact = (id: string) => contactsApi.get(id);
export const createContact = (data: CreateContactData) => contactsApi.create(data);
export const updateContact = (id: string, data: UpdateContactData) => contactsApi.update(id, data);
export const deleteContact = (id: string) => contactsApi.delete(id);
