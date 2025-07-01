// API Authentication middleware

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profiles";
import { unauthorizedError, forbiddenError, handleApiError } from "@/lib/utils/api-error";
import type { UserProfile } from "@/lib/supabase/profiles";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    profile: UserProfile;
  };
}

export function withAuth(handler: (request: AuthenticatedRequest) => Promise<Response>, requiredRoles?: string[]) {
  return async (request: NextRequest) => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw unauthorizedError();
      }

      const profile = await getUserProfile(user.id);
      if (!profile) {
        throw unauthorizedError();
      }

      // Check role permissions if required
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(profile.role)) {
          throw forbiddenError();
        }
      }

      // Add user info to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = {
        id: user.id,
        profile,
      };

      return handler(authenticatedRequest);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
