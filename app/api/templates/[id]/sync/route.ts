// Individual Template Sync API Route
import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { TemplateService } from "@/lib/twilio/templates";
import { hasPermission } from "@/lib/supabase/rbac";
import { createAdminClient } from "@/lib/supabase/admin.server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      if (!req.user) {
        return NextResponse.json(errorResponse("User not authenticated"), { status: 401 });
      }

      // Check permissions - only leaders and above can sync templates
      if (!hasPermission(req.user.profile.role, "manage_campaigns")) {
        return NextResponse.json(errorResponse("Insufficient permissions to sync templates"), { status: 403 });
      }

      const { id } = params;

      if (!id) {
        return NextResponse.json(errorResponse("Template ID is required"), { status: 400 });
      }

      // Get template from database
      const supabase = createAdminClient();
      const { data: template, error: templateError } = await supabase
        .from("message_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (templateError || !template) {
        return NextResponse.json(errorResponse("Template not found"), { status: 404 });
      }

      if (!template.template_id) {
        return NextResponse.json(errorResponse("Template has no Twilio ID"), { status: 400 });
      }

      // Fetch fresh template from Twilio
      const templateService = new TemplateService();
      const freshTwilioTemplate = await templateService.fetchTwilioTemplate(template.template_id);

      if (!freshTwilioTemplate) {
        return NextResponse.json(errorResponse("Template not found in Twilio"), { status: 404 });
      }

      // Update template with fresh data
      const updatedTemplate = {
        twilio_metadata: {
          approval_links: freshTwilioTemplate.links,
          date_created: freshTwilioTemplate.date_created,
          date_updated: freshTwilioTemplate.date_updated,
          variables: freshTwilioTemplate.variables,
          original_body_text: freshTwilioTemplate.types?.['twilio/media']?.body || 
                              freshTwilioTemplate.types?.['twilio/text']?.body || 
                              freshTwilioTemplate.types?.['twilio/card']?.body || 
                              "No content",
        },
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("message_templates")
        .update(updatedTemplate)
        .eq("id", id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json(
        successResponse("Template synced successfully", {
          templateId: id,
          templateName: template.name,
          syncedAt: new Date().toISOString(),
          freshData: freshTwilioTemplate,
          message: "Template has been updated with fresh data from Twilio"
        }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}