// Generic API Hook
import { useState, useCallback } from "react";
import { ApiResponse } from "@/lib/utils/api-response";
import { toast } from "sonner";

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

export function useApi<T = any>(apiFunction: (...args: any[]) => Promise<ApiResponse<T>>, options: UseApiOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const { onSuccess, onError, showErrorToast = true, showSuccessToast = false, successMessage } = options;

  const execute = useCallback(
    async (...args: Parameters<typeof apiFunction>) => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiFunction(...args);

        if (response.success) {
          setData(response.data || null);
          onSuccess?.(response.data);

          if (showSuccessToast) {
            toast.success(successMessage || response.message || "Success!");
          }

          return response;
        } else {
          throw new Error(response.message || "An error occurred");
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("An unknown error occurred");
        setError(error);
        onError?.(error);

        if (showErrorToast) {
          toast.error(error.message);
        }

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, onSuccess, onError, showErrorToast, showSuccessToast, successMessage]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, execute, reset };
}
