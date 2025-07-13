// Contacts Management Hooks - Following Teams Pattern
import { useEffect, useState, useCallback } from "react";
import { useApi } from "./use-api";
import { contactsApi, PaginationParams, CreateContactData, UpdateContactData, Contact } from "@/lib/api/contacts";
import { toast } from "sonner";

// Hook for listing contacts - FIXED to follow teams pattern
export function useContacts(params?: PaginationParams) {
  const { data, error, loading, execute } = useApi(contactsApi.list);

  useEffect(() => {
    execute(params);
  }, [execute, params?.page, params?.limit, params?.sort, params?.order, params?.search]);

  return {
    contacts: data?.contacts || [],
    pagination: data?.pagination || null,
    error,
    loading,
    refetch: () => execute(params),
  };
}

// Hook for getting single contact
export function useContact(id: string) {
  const { data, error, loading, execute } = useApi(contactsApi.get);

  useEffect(() => {
    if (id) {
      execute(id);
    }
  }, [execute, id]);

  return {
    contact: data?.contact || null,
    error,
    loading,
    refetch: () => execute(id),
  };
}

// Hook for creating contacts
export function useCreateContact() {
  return useApi(contactsApi.create, {
    showSuccessToast: true,
    successMessage: "Contact created successfully!",
  });
}

// Hook for updating contacts
export function useUpdateContact() {
  return useApi(contactsApi.update, {
    showSuccessToast: true,
    successMessage: "Contact updated successfully!",
  });
}

// Hook for deleting contacts
export function useDeleteContact() {
  return useApi(contactsApi.delete, {
    showSuccessToast: true,
    successMessage: "Contact deleted successfully!",
  });
}
