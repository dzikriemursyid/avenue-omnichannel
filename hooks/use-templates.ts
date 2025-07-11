// Template Management Hooks
import { useEffect } from "react";
import { useApi } from "./use-api";
import { templateApi, CreateTemplateRequest } from "@/lib/api/templates";

// Hook for listing templates
export function useTemplates() {
  const { data, error, loading, execute } = useApi(templateApi.list);

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    templates: data || [],
    error,
    loading,
    refetch: execute,
  };
}

// Hook for getting single template
export function useTemplate(id: string) {
  const { data, error, loading, execute } = useApi(() => templateApi.get(id));

  useEffect(() => {
    if (id) {
      execute();
    }
  }, [execute, id]);

  return {
    template: data,
    error,
    loading,
    refetch: execute,
  };
}

// Hook for creating template
export function useCreateTemplate() {
  return useApi(templateApi.create, {
    showSuccessToast: true,
    successMessage: "Template created successfully",
  });
}

// Hook for updating template
export function useUpdateTemplate() {
  return useApi(templateApi.update, {
    showSuccessToast: true,
    successMessage: "Template updated successfully",
  });
}

// Hook for deleting template
export function useDeleteTemplate() {
  return useApi(templateApi.delete, {
    showSuccessToast: true,
    successMessage: "Template deleted successfully",
  });
}

// Hook for syncing templates from Twilio
export function useSyncTemplates() {
  return useApi(templateApi.sync, {
    showSuccessToast: true,
    successMessage: "Templates synced successfully from Twilio",
  });
}
