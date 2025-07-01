// Individual User Management API Route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateUser, deactivateUser, deleteUser } from "@/lib/actions/user-management";
import { getUserProfile } from "@/lib/supabase/profiles";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, idParamsSchema } from "@/lib/utils/api-validation";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";

// Update user request schema
const updateUserSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["admin", "general_manager", "leader", "agent"]),
  team_id: z.string().nullable().optional(),
  is_active: z.boolean(),
});

// GET /api/dashboard/users/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Validate ID parameter
      const validatedParams = await validateRequest(params, idParamsSchema);
      const userId = validatedParams.id;

      // Check permissions
      const currentUserRole = req.user?.profile.role;
      const currentUserId = req.user?.id;

      // Admin can view anyone, others can only view themselves
      if (currentUserRole !== "admin" && currentUserId !== userId) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Get user profile
      const userProfile = await getUserProfile(userId);

      if (!userProfile) {
        return NextResponse.json(errorResponse("User not found"), { status: 404 });
      }

      return NextResponse.json(successResponse("User retrieved successfully", userProfile));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// PUT /api/dashboard/users/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Validate ID parameter
      const validatedParams = await validateRequest(params, idParamsSchema);
      const userId = validatedParams.id;

      // Check permissions - only admin and GM can update users
      const currentUserRole = req.user?.profile.role;
      if (!["admin", "general_manager"].includes(currentUserRole!)) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, updateUserSchema);

      // Create FormData for compatibility with existing action
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("full_name", validatedData.full_name);
      formData.append("role", validatedData.role);
      if (validatedData.team_id) {
        formData.append("team_id", validatedData.team_id);
      }
      if (validatedData.is_active) {
        formData.append("is_active", "true");
      }

      // Call existing user update action
      const result = await updateUser(formData);

      if (!result.success) {
        return NextResponse.json(errorResponse(result.message, result.errors), { status: 400 });
      }

      // Get updated user profile
      const updatedProfile = await getUserProfile(userId);

      return NextResponse.json(successResponse("User updated successfully", updatedProfile), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// DELETE /api/dashboard/users/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Validate ID parameter
      const validatedParams = await validateRequest(params, idParamsSchema);
      const userId = validatedParams.id;

      // Check permissions - only admin can delete users
      const currentUserRole = req.user?.profile.role;
      if (currentUserRole !== "admin") {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Prevent self-deletion
      if (req.user?.id === userId) {
        return NextResponse.json(errorResponse("Cannot delete your own account"), { status: 400 });
      }

      // Call existing user deletion action
      const result = await deleteUser(userId);

      if (!result.success) {
        return NextResponse.json(errorResponse(result.message, result.errors), { status: 400 });
      }

      return NextResponse.json(successResponse("User deleted successfully"), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
