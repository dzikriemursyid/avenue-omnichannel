// Individual Template Fetch API Route
import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { TemplateService } from "@/lib/twilio/templates";
import { hasPermission } from "@/lib/supabase/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: { sid: string } }
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      if (!req.user) {
        return NextResponse.json(errorResponse("User not authenticated"), { status: 401 });
      }

      // Check permissions - only leaders and above can fetch templates
      if (!hasPermission(req.user.profile.role, "manage_campaigns")) {
        return NextResponse.json(errorResponse("Insufficient permissions to fetch templates"), { status: 403 });
      }

      const { sid } = params;

      if (!sid) {
        return NextResponse.json(errorResponse("Template SID is required"), { status: 400 });
      }

      // Validate SID format
      if (!sid.match(/^HX[0-9a-fA-F]{32}$/)) {
        return NextResponse.json(errorResponse("Invalid template SID format"), { status: 400 });
      }

      // Fetch template from Twilio
      const templateService = new TemplateService();
      const template = await templateService.fetchTwilioTemplate(sid);

      if (!template) {
        return NextResponse.json(errorResponse("Template not found"), { status: 404 });
      }

      return NextResponse.json(
        successResponse("Template fetched successfully", template),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}