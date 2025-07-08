// Password Update API Route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateUserPassword } from "@/lib/actions/user-management";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, idParamsSchema } from "@/lib/utils/api-validation";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";

// Update password request schema
const updatePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// PUT /api/dashboard/users/[id]/password
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Validate ID parameter
      const { id: userId } = await params;
      const validatedParams = await validateRequest({ id: userId }, idParamsSchema);
      const validatedUserId = validatedParams.id;

      // Check permissions - only admin can update passwords
      const currentUserRole = req.user?.profile.role;
      if (currentUserRole !== "admin") {
        return NextResponse.json(errorResponse("Insufficient permissions - only admin can update passwords"), { status: 403 });
      }

      // Prevent self-password update for security
      if (req.user?.id === validatedUserId) {
        return NextResponse.json(errorResponse("Cannot update your own password through this endpoint"), { status: 400 });
      }

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, updatePasswordSchema);

      // Create FormData for compatibility with existing action
      const formData = new FormData();
      formData.append("user_id", validatedUserId);
      formData.append("password", validatedData.password);

      // Call existing password update action
      const result = await updateUserPassword(formData);

      if (!result.success) {
        return NextResponse.json(errorResponse(result.message, result.errors), { status: 400 });
      }

      return NextResponse.json(successResponse("Password updated successfully"), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
