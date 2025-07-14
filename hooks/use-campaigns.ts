// Campaign Management Hooks
import { useState, useEffect, useCallback, useMemo } from "react";
import { useApi } from "./use-api";
import { campaignApi, SendCampaignRequest } from "@/lib/api/campaigns";
import { useToast } from "@/components/ui/use-toast";

// Hook for listing campaigns
export function useCampaigns(params?: { page?: number; limit?: number; status?: string }) {
  // Memoize the API function to prevent recreation on every render
  const apiFunction = useMemo(() => {
    return () => campaignApi.list(params);
  }, [params?.page, params?.limit, params?.status]);

  const { data, error, loading, execute } = useApi(apiFunction);

  // Auto-fetch data on mount and when params change
  useEffect(() => {
    execute();
  }, [execute]);

  return {
    campaigns: data?.campaigns || [],
    pagination: data?.pagination || null,
    error,
    loading,
    refetch: execute,
  };
}

// Hook for getting single campaign
export function useCampaign(id: string) {
  // Memoize the API function to prevent recreation on every render
  const apiFunction = useMemo(() => {
    return () => campaignApi.get(id);
  }, [id]);

  const { data, error, loading, execute } = useApi(apiFunction);

  // Auto-fetch data on mount and when id changes
  useEffect(() => {
    if (id) {
      execute();
    }
  }, [execute]);

  return {
    campaign: data,
    error,
    loading,
    refetch: execute,
  };
}

// Hook for sending campaign
export function useSendCampaign() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCampaign = async (campaignId: string, options?: SendCampaignRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await campaignApi.send(campaignId, options);

      if (response.success) {
        toast({
          title: "Campaign Sent Successfully",
          description: response.data?.message || `${response.data?.totalSent} messages sent successfully`,
        });
        return response.data;
      } else {
        throw new Error(response.message || "Failed to send campaign");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send campaign";
      setError(errorMessage);
      toast({
        title: "Campaign Send Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendCampaign,
    loading,
    error,
  };
}

// Hook for pausing campaign
export function usePauseCampaign() {
  const { toast } = useToast();

  return useApi(campaignApi.pause, {
    showSuccessToast: true,
    successMessage: "Campaign paused successfully",
  });
}

// Hook for resuming campaign
export function useResumeCampaign() {
  const { toast } = useToast();

  return useApi(campaignApi.resume, {
    showSuccessToast: true,
    successMessage: "Campaign resumed successfully",
  });
}

// Hook for creating campaign
export function useCreateCampaign() {
  return useApi(campaignApi.create, {
    showSuccessToast: true,
    successMessage: "Campaign created successfully",
  });
}

// Hook for updating campaign
export function useUpdateCampaign() {
  return useApi(campaignApi.update, {
    showSuccessToast: true,
    successMessage: "Campaign updated successfully",
  });
}

// Hook for deleting campaign
export function useDeleteCampaign() {
  return useApi(campaignApi.delete, {
    showSuccessToast: true,
    successMessage: "Campaign deleted successfully",
  });
}
