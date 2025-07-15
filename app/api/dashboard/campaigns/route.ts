import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedRequest } from "@/lib/middleware/api-auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest, paginationSchema } from "@/lib/utils/api-validation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/rbac";

// Campaign creation schema
const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100, "Campaign name must be less than 100 characters").trim(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  template_id: z.string().uuid("Invalid template ID"),
  audience_id: z.string().uuid("Invalid audience ID"),
  schedule_type: z.enum(["immediate", "scheduled"], {
    errorMap: () => ({ message: "Schedule type must be 'immediate' or 'scheduled'" }),
  }),
  scheduled_at: z.string().datetime().optional(),
  template_variables: z.record(z.string()).optional(), // Dynamic template variables
  variable_source: z.enum(["manual", "contact"]).optional().default("manual"), // Source for contact-related variables
});

// GET /api/dashboard/campaigns - List campaigns
export async function GET(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "view_campaigns")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      // Parse query parameters
      const url = new URL(request.url);
      const queryParams = {
        page: url.searchParams.get("page") || "1",
        limit: url.searchParams.get("limit") || "50",
        status: url.searchParams.get("status") || undefined,
      };

      const pagination = await validateRequest(queryParams, paginationSchema);
      const status = queryParams.status;

      const supabase = await createClient();

      // Build query with analytics and creator profile
      let query = supabase
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
            status
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
            read_rate
          )
        `
        )
        .order("created_at", { ascending: false });

      // Apply status filter if provided
      if (status) {
        query = query.eq("status", status);
      }

      // Apply pagination
      const limit = pagination.limit || 50;
      const offset = ((pagination.page || 1) - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: campaigns, error } = await query;

      if (error) {
        console.error("❌ Error fetching campaigns:", error);
        return NextResponse.json(errorResponse("Failed to fetch campaigns"), { status: 500 });
      }

      // Enhance campaigns with target count from contact groups
      const enhancedCampaigns = await Promise.all(
        (campaigns || []).map(async (campaign) => {
          let targetCount = 0;

          if (campaign.target_segments && campaign.target_segments.length > 0) {
            const { data: groups, error: groupsError } = await supabase.from("contact_groups").select("contact_count").in("id", campaign.target_segments);

            if (groupsError) {
              console.error("❌ Error fetching contact groups:", groupsError);
            }

            targetCount = groups?.reduce((sum, group) => sum + (group.contact_count || 0), 0) || 0;
          }

          // Get analytics data - handle both array and object formats
          const analytics = (campaign as any).campaign_analytics;
          const analyticsData = Array.isArray(analytics) ? analytics[0] : analytics;

          const enhanced = {
            ...campaign,
            target_count: targetCount,
            template_name: (campaign as any).message_templates?.name || "Unknown Template",
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

          return enhanced;
        })
      );

      // Get total count for pagination
      let countQuery = supabase.from("campaigns").select("*", { count: "exact", head: true });
      if (status) {
        countQuery = countQuery.eq("status", status);
      }
      const { count } = await countQuery;

      const responseData = {
        campaigns: enhancedCampaigns || [],
        pagination: {
          page: pagination.page || 1,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: (count || 0) > offset + limit,
        },
      };

      return NextResponse.json(successResponse("Campaigns retrieved successfully", responseData));
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}

// POST /api/dashboard/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      // Check permissions
      if (!req.user?.profile || !hasPermission(req.user.profile.role, "manage_campaigns")) {
        return NextResponse.json(errorResponse("Insufficient permissions"), { status: 403 });
      }

      const body = await req.json();
      const validatedData = await validateRequest(body, createCampaignSchema);

      const supabase = await createClient();

      // Check if template exists and is approved
      const { data: template, error: templateError } = await supabase.from("message_templates").select("id, name, status").eq("id", validatedData.template_id).single();

      if (templateError || !template) {
        return NextResponse.json(errorResponse("Template not found"), { status: 404 });
      }

      if (template.status !== "approved") {
        return NextResponse.json(errorResponse("Template must be approved before use"), { status: 400 });
      }

      // Check if audience (contact group) exists
      const { data: audience, error: audienceError } = await supabase.from("contact_groups").select("id, name, contact_count").eq("id", validatedData.audience_id).single();

      if (audienceError || !audience) {
        return NextResponse.json(errorResponse("Contact group not found"), { status: 404 });
      }

      // Prepare campaign data
      const campaignData = {
        name: validatedData.name,
        description: validatedData.description || null,
        template_id: validatedData.template_id,
        target_segments: [validatedData.audience_id], // Store audience as target segment
        schedule_type: validatedData.schedule_type,
        scheduled_at: validatedData.scheduled_at || null,
        status: validatedData.schedule_type === "immediate" ? "draft" : "scheduled",
        created_by: req.user!.id,
        template_variables: validatedData.template_variables || {},
        variable_source: validatedData.variable_source || "manual", // Store variable source
      };

      // Create campaign
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .insert(campaignData)
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
          updated_at
        `
        )
        .single();

      if (error) {
        console.error("Error creating campaign:", error);
        return NextResponse.json(errorResponse("Failed to create campaign"), { status: 500 });
      }

      // If immediate campaign, send it right away
      if (validatedData.schedule_type === "immediate") {
        try {
          // Import and use CampaignSender
          const { CampaignSender } = await import("@/lib/twilio/campaign-sender");
          const campaignSender = new CampaignSender();

          // Send campaign in background
          campaignSender
            .sendCampaign({
              campaignId: campaign.id,
              batchSize: 50,
              delayBetweenBatches: 1000,
            })
            .catch((sendError) => {
              console.error("Background campaign send error:", sendError);
              // Update campaign status to failed
              supabase
                .from("campaigns")
                .update({ status: "failed" })
                .eq("id", campaign.id)
                .then(() => console.log("Campaign status updated to failed"));
            });
        } catch (sendError) {
          console.error("Error initiating campaign send:", sendError);
          // Don't fail the campaign creation, just log the error
        }
      }

      return NextResponse.json(
        successResponse("Campaign created successfully", {
          campaign,
          template: { id: template.id, name: template.name },
          audience: { id: audience.id, name: audience.name, contact_count: audience.contact_count },
        }),
        { status: 201 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  })(request);
}
