// Template Sync API Route
import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { TemplateService } from "@/lib/twilio/templates";
import { hasPermission } from "@/lib/supabase/rbac";

export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      if (!req.user) {
        return NextResponse.json(errorResponse("User not authenticated"), { status: 401 });
      }

      // Check permissions - only leaders and above can sync templates
      if (!hasPermission(req.user.profile.role, "manage_campaigns")) {
        return NextResponse.json(errorResponse("Insufficient permissions to sync templates"), { status: 403 });
      }

      // Sync templates from Twilio
      const templateService = new TemplateService();
      const result = await templateService.syncTemplatesFromTwilio(req.user.id);

      const message = `Successfully synced ${result.synced} templates${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ""}`;

      return NextResponse.json(
        successResponse(message, {
          ...result,
          message,
        }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
