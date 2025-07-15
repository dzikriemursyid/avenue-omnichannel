// Template Debug API Route
import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { hasPermission } from "@/lib/supabase/rbac";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { TemplateService } from "@/lib/twilio/templates";

export async function GET(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      if (!req.user) {
        return NextResponse.json(errorResponse("User not authenticated"), { status: 401 });
      }

      // Check permissions - only admin can debug
      if (!hasPermission(req.user.profile.role, "manage_campaigns")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const supabase = createAdminClient();
      const url = new URL(request.url);
      const templateId = url.searchParams.get("template_id");

      // Get debug info
      const { data: debugData, error: debugError } = await supabase.rpc("debug_template_variables", { template_uuid: templateId || null });

      if (debugError) {
        console.error("Debug template variables error:", debugError);
        return NextResponse.json(errorResponse("Failed to get debug info"), { status: 500 });
      }

      // Get template usage info
      const { data: usageData, error: usageError } = await supabase.rpc("check_template_variable_usage");

      if (usageError) {
        console.error("Template usage check error:", usageError);
        return NextResponse.json(errorResponse("Failed to get usage info"), { status: 500 });
      }

      // Get validation issues
      const { data: validationData, error: validationError } = await supabase.rpc("validate_template_variables_consistency");

      if (validationError) {
        console.error("Template validation error:", validationError);
        return NextResponse.json(errorResponse("Failed to validate templates"), { status: 500 });
      }

      const debugInfo = {
        templates: debugData || [],
        usage: usageData || [],
        validation_issues: validationData || [],
        summary: {
          total_templates: debugData?.length || 0,
          templates_with_variables: debugData?.filter((t: any) => t.variable_count > 0).length || 0,
          templates_with_issues: validationData?.length || 0,
          total_campaigns_using_variables: usageData?.reduce((sum: number, item: any) => sum + item.campaigns_with_variables, 0) || 0,
        },
      };

      return NextResponse.json(successResponse("Debug info retrieved successfully", debugInfo));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// POST endpoint for forcing template sync and variable extraction testing
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      if (!req.user) {
        return NextResponse.json(errorResponse("User not authenticated"), { status: 401 });
      }

      // Check permissions - only admin can debug
      if (!hasPermission(req.user.profile.role, "manage_campaigns")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const body = await req.json();
      const { force_resync = false, templateContent } = body;

      if (force_resync) {
        // Force resync all templates
        const templateService = new TemplateService();
        await templateService.init();
        const result = await templateService.syncTemplatesFromTwilio(req.user.id);

        return NextResponse.json(successResponse("Templates force synced successfully", result));
      } else if (templateContent) {
        // Test variable extraction
        const templateService = new TemplateService();
        await templateService.init();

        const extractionResult = templateService.testVariableExtraction(templateContent);

        return NextResponse.json(
          successResponse("Variable extraction test completed", {
            templateContent,
            extractionResult,
          })
        );
      } else {
        return NextResponse.json(errorResponse("No action specified"), { status: 400 });
      }
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
