// Campaign Send API Route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest } from "@/lib/utils/api-validation";
import { CampaignSender } from "@/lib/twilio/campaign-sender";
import { hasPermission } from "@/lib/supabase/rbac";

// Send campaign request schema
const sendCampaignSchema = z.object({
  batchSize: z.number().min(1).max(100).optional().default(50),
  delayBetweenBatches: z.number().min(100).max(5000).optional().default(1000),
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { id: campaignId } = params;

      // Check permissions
      if (!req.user || !hasPermission(req.user.profile.role, "manage_campaigns")) {
        return NextResponse.json(errorResponse("Insufficient permissions to send campaigns"), { status: 403 });
      }

      // Parse and validate request body
      const body = await req.json();
      const validatedData = await validateRequest(body, sendCampaignSchema);

      // Initialize campaign sender
      const campaignSender = new CampaignSender();

      // Send the campaign
      const result = await campaignSender.sendCampaign({
        campaignId,
        batchSize: validatedData.batchSize,
        delayBetweenBatches: validatedData.delayBetweenBatches,
      });

      return NextResponse.json(
        successResponse(result.message, {
          ...result,
          campaignId,
        }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
