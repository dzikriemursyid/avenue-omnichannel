import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: campaignId } = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to determine access level
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, team_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if campaign exists and user has access
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, name, created_by, created_at")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get campaign activation statistics
    
    // 1. Total conversations created by this campaign
    const { count: totalConversations } = await supabase
      .from("conversations")
      .select("id", { count: "exact" })
      .eq("created_by_campaign", campaignId);

    // 2. Activated conversations (dormant -> active)
    const { count: activatedConversations } = await supabase
      .from("conversations")
      .select("id", { count: "exact" })
      .eq("created_by_campaign", campaignId)
      .eq("visibility_status", "active");

    // 3. Still dormant conversations
    const { count: dormantConversations } = await supabase
      .from("conversations")
      .select("id", { count: "exact" })
      .eq("created_by_campaign", campaignId)
      .eq("visibility_status", "dormant");

    // 4. Campaign message statistics
    const { data: messageStats } = await supabase
      .from("campaign_messages")
      .select("status")
      .eq("campaign_id", campaignId);

    // 5. Get conversation details for activated conversations
    const { data: activatedDetails } = await supabase
      .from("conversations")
      .select(`
        id,
        created_at,
        updated_at,
        contacts!inner (
          name,
          phone_number
        ),
        messages (
          id,
          direction,
          timestamp
        )
      `)
      .eq("created_by_campaign", campaignId)
      .eq("visibility_status", "active")
      .order("updated_at", { ascending: false });

    // Calculate activation rate
    const activationRate = totalConversations > 0 
      ? Math.round((activatedConversations / totalConversations) * 100) 
      : 0;

    // Process message statistics
    const messageStatsProcessed = messageStats?.reduce((acc, msg) => {
      acc[msg.status] = (acc[msg.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Calculate response time for activated conversations
    const responseTimeData = activatedDetails?.map(conv => {
      const firstInboundMessage = conv.messages
        ?.filter(m => m.direction === 'inbound')
        ?.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
      
      if (firstInboundMessage) {
        const campaignTime = new Date(conv.created_at).getTime();
        const responseTime = new Date(firstInboundMessage.timestamp).getTime();
        const responseDelayHours = Math.round((responseTime - campaignTime) / (1000 * 60 * 60));
        
        return {
          conversationId: conv.id,
          contactName: conv.contacts.name,
          phoneNumber: conv.contacts.phone_number,
          responseDelayHours,
          activatedAt: firstInboundMessage.timestamp
        };
      }
      return null;
    }).filter(Boolean) || [];

    // Calculate average response time
    const avgResponseTime = responseTimeData.length > 0
      ? Math.round(responseTimeData.reduce((sum, data) => sum + data.responseDelayHours, 0) / responseTimeData.length)
      : 0;

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        created_at: campaign.created_at
      },
      stats: {
        totalConversations: totalConversations || 0,
        activatedConversations: activatedConversations || 0,
        dormantConversations: dormantConversations || 0,
        activationRate,
        avgResponseTimeHours: avgResponseTime
      },
      messageStats: {
        sent: messageStatsProcessed.sent || 0,
        delivered: messageStatsProcessed.delivered || 0,
        read: messageStatsProcessed.read || 0,
        failed: messageStatsProcessed.failed || 0
      },
      activatedDetails: responseTimeData.slice(0, 10), // Limit to 10 most recent
    });

  } catch (error: any) {
    console.error("❌ Campaign activation stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}