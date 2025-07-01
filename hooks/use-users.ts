// User Management Hooks
import { useEffect } from "react";
import { useApi } from "./use-api";
import { usersApi, PaginationParams } from "@/lib/api";

export function useUsers(params?: PaginationParams) {
  const { data, error, loading, execute } = useApi(usersApi.list);

  useEffect(() => {
    execute(params);
  }, [execute, params?.page, params?.limit, params?.sort, params?.order]);

  return {
    users: data?.users || [],
    pagination: data?.pagination || null,
    error,
    loading,
    refetch: () => execute(params),
  };
}

export function useUser(id: string) {
  const { data, error, loading, execute } = useApi(usersApi.get);

  useEffect(() => {
    if (id) {
      execute(id);
    }
  }, [execute, id]);

  return {
    user: data?.user || null,
    error,
    loading,
    refetch: () => execute(id),
  };
}

export function useCreateUser() {
  return useApi(usersApi.create, {
    showSuccessToast: true,
    successMessage: "User created successfully!",
  });
}

export function useUpdateUser() {
  return useApi(usersApi.update, {
    showSuccessToast: true,
    successMessage: "User updated successfully!",
  });
}

export function useDeleteUser() {
  return useApi(usersApi.delete, {
    showSuccessToast: true,
    successMessage: "User deleted successfully!",
  });
}
