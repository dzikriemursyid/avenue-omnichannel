// Twilio Webhook Handler
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { messageStatusMap } from "@/lib/twilio/client";

// Twilio sends data as form-encoded
async function parseFormData(request: NextRequest) {
  const text = await request.text();
  const params = new URLSearchParams(text);
  const data: Record<string, string> = {};

  for (const [key, value] of params) {
    data[key] = value;
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const data = await parseFormData(request);

    // Extract message information
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage, From, To, Body } = data;

    console.log("Twilio webhook received:", {
      MessageSid,
      MessageStatus,
      ErrorCode,
      From,
      To,
    });

    // Map Twilio status to internal status
    const internalStatus = messageStatusMap[MessageStatus as keyof typeof messageStatusMap] || "pending";

    // Update campaign message status
    const { error: updateError } = await supabase
      .from("campaign_messages")
      .update({
        status: internalStatus,
        error_message: ErrorMessage || null,
        delivered_at: MessageStatus === "delivered" ? new Date().toISOString() : null,
        read_at: MessageStatus === "read" ? new Date().toISOString() : null,
      })
      .eq("message_sid", MessageSid);

    if (updateError) {
      console.error("Error updating message status:", updateError);
    }

    // Update campaign analytics if message is delivered or failed
    if (MessageStatus === "delivered" || MessageStatus === "read" || MessageStatus === "failed") {
      // Get campaign_id from the message
      const { data: message } = await supabase.from("campaign_messages").select("campaign_id").eq("message_sid", MessageSid).single();

      if (message?.campaign_id) {
        // Update analytics
        await updateCampaignAnalytics(supabase, message.campaign_id);
      }
    }

    // Return 200 OK to Twilio
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    // Still return 200 to prevent Twilio from retrying
    return new NextResponse("OK", { status: 200 });
  }
}

// Update campaign analytics based on message statuses
async function updateCampaignAnalytics(supabase: any, campaignId: string) {
  // Get message counts
  const { data: stats } = await supabase.from("campaign_messages").select("status").eq("campaign_id", campaignId);

  if (!stats) return;

  const counts = stats.reduce((acc: any, msg: any) => {
    acc[msg.status] = (acc[msg.status] || 0) + 1;
    return acc;
  }, {});

  const totalSent = stats.length;
  const totalDelivered = counts.delivered || 0;
  const totalRead = counts.read || 0;
  const totalFailed = counts.failed || 0;

  // Calculate rates
  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
  const readRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;

  // Update analytics
  await supabase.from("campaign_analytics").upsert({
    campaign_id: campaignId,
    total_sent: totalSent,
    total_delivered: totalDelivered,
    total_read: totalRead,
    total_failed: totalFailed,
    delivery_rate: deliveryRate,
    read_rate: readRate,
    updated_at: new Date().toISOString(),
  });

  // Check if campaign is completed
  const pendingCount = counts.pending || 0;
  const sentCount = counts.sent || 0;

  if (pendingCount === 0 && sentCount === 0) {
    // All messages have been processed
    await supabase
      .from("campaigns")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
  }
}
