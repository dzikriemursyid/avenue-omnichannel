import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { hasPermission } from "@/lib/supabase/rbac";
import { errorResponse, successResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_campaigns")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const { id: campaignId } = await params;
      const supabase = await createClient();

      // Get campaign messages with contact info
      const { data: messages, error } = await supabase
        .from("campaign_messages")
        .select(
          `
          id,
          phone_number,
          status,
          error_message,
          sent_at,
          delivered_at,
          read_at,
          created_at,
          contacts (
            id,
            name
          )
        `
        )
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("❌ Error fetching campaign messages:", error);
        return NextResponse.json(errorResponse("Failed to fetch campaign messages"), { status: 500 });
      }

      // Format messages for frontend
      const formattedMessages =
        messages?.map((message) => ({
          id: message.id,
          phone_number: message.phone_number,
          contact_name: (message as any).contacts?.name || null,
          status: message.status,
          error_message: message.error_message,
          sent_at: message.sent_at,
          delivered_at: message.delivered_at,
          read_at: message.read_at,
          created_at: message.created_at,
        })) || [];

      return NextResponse.json(
        successResponse("Campaign messages fetched successfully", {
          messages: formattedMessages,
          total: formattedMessages.length,
        })
      );
    } catch (error) {
      console.error("❌ Campaign messages API error:", error);
      return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
    }
  })(request);
}
