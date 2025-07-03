import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getTeamsForUser } from "@/lib/supabase/teams";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, paginationSchema } from "@/lib/utils/api-validation";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { revalidatePath } from "next/cache";

// Create team request schema
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name must be less than 100 characters").trim(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  is_active: z.boolean().default(true),
});

// GET /api/dashboard/teams
export async function GET(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      const userRole = req.user?.profile.role;
      const userId = req.user?.id;

      if (!["admin", "general_manager", "leader"].includes(userRole!)) {
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

      // Get teams based on user role
      const teams = await getTeamsForUser(userId!, userRole!);

      // Simple client-side pagination for now
      const page = pagination.page ?? 1;
      const limit = pagination.limit ?? 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTeams = teams.slice(startIndex, endIndex);

      return NextResponse.json(
        successResponse("Teams retrieved successfully", {
          teams: paginatedTeams,
          pagination: {
            page,
            limit,
            total: teams.length,
            totalPages: Math.ceil(teams.length / limit),
          },
        })
      );
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// POST /api/dashboard/teams - DIRECT DATABASE APPROACH
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions - only admin and GM can create teams
      const userRole = req.user?.profile.role;
      if (!["admin", "general_manager"].includes(userRole!)) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse request body
      const body = await req.json();
      const validatedData = await validateRequest(body, createTeamSchema);

      // Create Supabase client using the auth from middleware
      const supabase = await createClient();

      // Insert team directly into database
      const { data: newTeam, error: dbError } = await supabase
        .from("teams")
        .insert({
          name: validatedData.name,
          description: validatedData.description || null,
          is_active: validatedData.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error creating team:", dbError);

        // Handle specific database errors
        if (dbError.code === "23505") {
          // Unique constraint violation
          return NextResponse.json(errorResponse("Team name already exists"), { status: 400 });
        }

        return NextResponse.json(errorResponse("Failed to create team in database"), { status: 500 });
      }

      // Revalidate the teams page cache
      try {
        revalidatePath("/dashboard/teams");
      } catch (revalidateError) {
        console.warn("Cache revalidation failed:", revalidateError);
        // Don't fail the request if revalidation fails
      }

      // Return success response
      return NextResponse.json(successResponse("Team created successfully", { team: newTeam }), { status: 201 });
    } catch (error) {
      console.error("Unexpected error creating team:", error);
      return handleApiError(error);
    }
  })(request);
}
