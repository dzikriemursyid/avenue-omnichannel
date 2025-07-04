// Profile Management API Route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateProfile } from "@/lib/actions/profile";
import { getUserProfile } from "@/lib/supabase/profiles";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest } from "@/lib/utils/api-validation";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";

// Update profile request schema
const updateProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone_number: z.string().nullable().optional(),
});

// GET /api/dashboard/profile
export async function GET(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const profile = req.user?.profile;

      if (!profile) {
        return NextResponse.json(errorResponse("Profile not found"), { status: 404 });
      }

      return NextResponse.json(successResponse("Profile retrieved successfully", profile));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// PUT /api/dashboard/profile
export async function PUT(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, updateProfileSchema);

      // Create FormData for compatibility with existing action
      const formData = new FormData();
      formData.append("full_name", validatedData.full_name);
      if (validatedData.phone_number) {
        formData.append("phone_number", validatedData.phone_number);
      } else {
        formData.append("phone_number", "");
      }

      // Call existing profile update action
      const result = await updateProfile(formData);

      if (!result.success) {
        return NextResponse.json(errorResponse(result.message, result.errors), { status: 400 });
      }

      // Get updated profile
      const updatedProfile = await getUserProfile(req.user?.id!);

      return NextResponse.json(successResponse("Profile updated successfully", updatedProfile), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
