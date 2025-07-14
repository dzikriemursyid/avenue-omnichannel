// Base API Client
import { ApiResponse } from "@/lib/utils/api-response";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;

    // Build URL with query parameters
    const fullEndpoint = this.baseUrl + endpoint;
    const url = new URL(fullEndpoint, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // Only add parameters that are not undefined or null
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      const response = await fetch(url.toString(), {
        ...fetchOptions,
        headers: {
          "Content-Type": "application/json",
          ...fetchOptions.headers,
        },
      });

      // First get the response as text to handle non-JSON responses
      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : "Unknown parse error";
        console.error("Failed to parse JSON response:", responseText.substring(0, 200));
        throw new Error(`Invalid JSON response: ${errorMessage}. Response preview: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        console.error("❌ API Error Response:", data);
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data as ApiResponse<T>;
    } catch (error) {
      console.error("❌ API request failed:", error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>) {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  async post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// Create a singleton instance
const apiClient = new ApiClient("/api");

export default apiClient;
