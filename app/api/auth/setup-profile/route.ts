// Setup Profile API Route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeProfileSetup } from "@/lib/actions/auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest } from "@/lib/utils/api-validation";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";

// Setup profile request schema
const setupProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, setupProfileSchema);

      // Create FormData for compatibility with existing action
      const formData = new FormData();
      formData.append("full_name", validatedData.full_name);
      if (validatedData.phone) {
        formData.append("phone", validatedData.phone);
      }

      // Call existing profile setup action
      const result = await completeProfileSetup(formData);

      if (!result.success) {
        return NextResponse.json(errorResponse(result.message, result.errors), { status: 400 });
      }

      // Success response
      return NextResponse.json(successResponse("Profile setup completed successfully"), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
