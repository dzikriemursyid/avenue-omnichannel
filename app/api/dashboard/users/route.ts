// User Management API Route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser, updateUser } from "@/lib/actions/user-management";
import { getAllUsers } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, paginationSchema } from "@/lib/utils/api-validation";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";

// Create user request schema
const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "general_manager", "leader", "agent"]),
  team_id: z.string().nullable().optional(),
});

// GET /api/dashboard/users
export async function GET(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions - only admin can view all users
      const userRole = req.user?.profile.role;
      if (userRole !== "admin") {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse query parameters for pagination
      const url = new URL(request.url);
      const queryParams = {
        page: url.searchParams.get("page") || "1",
        limit: url.searchParams.get("limit") || "10",
        sort: url.searchParams.get("sort") || "created_at",
        order: url.searchParams.get("order") || "desc",
      };

      const pagination = await validateRequest(queryParams, paginationSchema);

      // Get all users (for now, we'll implement pagination later)
      const users = await getAllUsers();

      // Simple client-side pagination for now
      const page = pagination.page ?? 1;
      const limit = pagination.limit ?? 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = users.slice(startIndex, endIndex);

      return NextResponse.json(
        successResponse("Users retrieved successfully", {
          users: paginatedUsers,
          pagination: {
            page,
            limit,
            total: users.length,
            totalPages: Math.ceil(users.length / limit),
          },
        })
      );
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// POST /api/dashboard/users
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions - only admin can create users
      const userRole = req.user?.profile.role;
      if (userRole !== "admin") {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, createUserSchema);

      // Create FormData for compatibility with existing action
      const formData = new FormData();
      formData.append("email", validatedData.email);
      formData.append("full_name", validatedData.full_name);
      formData.append("password", validatedData.password);
      formData.append("role", validatedData.role);
      if (validatedData.team_id) {
        formData.append("team_id", validatedData.team_id);
      }

      // Call existing user creation action
      const result = await createUser(formData);

      if (!result.success) {
        return NextResponse.json(errorResponse(result.message, result.errors), { status: 400 });
      }

      return NextResponse.json(successResponse("User created successfully", result.data), { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
