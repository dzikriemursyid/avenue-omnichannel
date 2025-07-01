// API Response utilities for standardized API responses

export type ApiResponse<T = any> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
};

export function createApiResponse<T>(success: boolean, message: string, data?: T, errors?: Record<string, string[]>): ApiResponse<T> {
  return { success, message, data, errors };
}

export function successResponse<T>(message: string, data?: T): ApiResponse<T> {
  return createApiResponse(true, message, data);
}

export function errorResponse(message: string, errors?: Record<string, string[]>): ApiResponse {
  return createApiResponse(false, message, undefined, errors);
}
