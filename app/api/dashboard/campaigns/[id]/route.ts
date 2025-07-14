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

      // Get campaign with analytics, template, and creator info
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .select(
          `
          id,
          name,
          description,
          template_id,
          target_segments,
          schedule_type,
          scheduled_at,
          status,
          created_by,
          created_at,
          updated_at,
          message_templates!inner(
            id,
            name,
            category,
            status,
            body_text
          ),
          profiles!inner(
            id,
            full_name
          ),
          campaign_analytics(
            total_sent,
            total_delivered,
            total_read,
            total_failed,
            delivery_rate,
            read_rate,
            updated_at
          )
        `
        )
        .eq("id", campaignId)
        .single();

      if (error) {
        console.error("❌ Error fetching campaign:", error);
        if (error.code === "PGRST116") {
          return NextResponse.json(errorResponse("Campaign not found"), { status: 404 });
        }
        return NextResponse.json(errorResponse("Failed to fetch campaign"), { status: 500 });
      }

      // Get target count from contact groups
      let targetCount = 0;
      if (campaign.target_segments && campaign.target_segments.length > 0) {
        const { data: groups, error: groupsError } = await supabase.from("contact_groups").select("contact_count").in("id", campaign.target_segments);

        if (!groupsError && groups) {
          targetCount = groups.reduce((sum, group) => sum + (group.contact_count || 0), 0);
        }
      }

      // Get analytics data - handle both array and object formats
      const analytics = (campaign as any).campaign_analytics;
      const analyticsData = Array.isArray(analytics) ? analytics[0] : analytics;
      
      // Format campaign data
      const formattedCampaign = {
        ...campaign,
        target_count: targetCount,
        template_name: (campaign as any).message_templates?.name || "Unknown Template",
        template_body: (campaign as any).message_templates?.body_text || "",
        created_by_name: (campaign as any).profiles?.full_name || "Unknown User",
        // Map analytics data to legacy fields for compatibility
        sent_count: analyticsData?.total_sent || 0,
        delivered_count: analyticsData?.total_delivered || 0,
        read_count: analyticsData?.total_read || 0,
        failed_count: analyticsData?.total_failed || 0,
        delivery_rate: analyticsData?.delivery_rate || 0,
        read_rate: analyticsData?.read_rate || 0,
        analytics_updated_at: analyticsData?.updated_at || null,
      };

      return NextResponse.json(successResponse("Campaign fetched successfully", formattedCampaign));
    } catch (error) {
      console.error("❌ Campaign API error:", error);
      return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
    }
  })(request);
}
