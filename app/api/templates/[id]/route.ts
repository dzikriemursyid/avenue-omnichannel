// Template Individual Operations API Routes
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest } from "@/lib/utils/api-validation";
import { TemplateService } from "@/lib/twilio/templates";

// Update template request schema
const updateTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  category: z.enum(["marketing", "utility", "authentication"]).optional(),
  language_code: z.string().optional(),
  header_text: z.string().optional(),
  body_text: z.string().min(1, "Body text is required").optional(),
  footer_text: z.string().optional(),
  button_config: z.any().optional(),
  variables: z.array(z.string()).optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id } = params;

      const templateService = new TemplateService();
      const template = await templateService.getTemplate(id);

      if (!template) {
        return NextResponse.json(errorResponse("Template not found"), { status: 404 });
      }

      return NextResponse.json(successResponse("Template fetched successfully", template), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id } = params;

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, updateTemplateSchema);

      // Update template
      const templateService = new TemplateService();
      const template = await templateService.updateTemplate(id, validatedData);

      return NextResponse.json(successResponse("Template updated successfully", template), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id } = params;

      // Delete template
      const templateService = new TemplateService();
      await templateService.deleteTemplate(id);

      return NextResponse.json(successResponse("Template deleted successfully"), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
