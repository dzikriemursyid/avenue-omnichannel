// Templates API Route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest } from "@/lib/utils/api-validation";
import { TemplateService } from "@/lib/twilio/templates";

// Create template request schema
const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  template_id: z.string().optional(),
  category: z.enum(["marketing", "utility", "authentication"]),
  language_code: z.string().default("id"),
  header_text: z.string().optional(),
  body_text: z.string().min(1, "Body text is required"),
  footer_text: z.string().optional(),
  button_config: z.any().optional(),
  variables: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const templateService = new TemplateService();
      const templates = await templateService.getLocalTemplates();

      return NextResponse.json(successResponse("Templates fetched successfully", templates), { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      if (!req.user) {
        return NextResponse.json(errorResponse("User not authenticated"), { status: 401 });
      }

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, createTemplateSchema);

      // Create template
      const templateService = new TemplateService();
      const template = await templateService.createTemplate(validatedData, req.user.id);

      return NextResponse.json(successResponse("Template created successfully", template), { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
