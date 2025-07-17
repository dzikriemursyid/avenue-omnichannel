// Twilio Webhook Handler
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
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

    const supabase = createAdminClient();
    const data = await parseFormData(request);


    // Store raw webhook payload in database for debugging
    try {
      const logData = {
        payload: data,
        webhook_type: "status",
        message_sid: data.MessageSid,
        raw_headers: Object.fromEntries(request.headers.entries()),
        received_at: new Date().toISOString(),
      };
      
      const { error: logError } = await supabase.from("twilio_webhook_logs").insert(logData);

      if (logError) {
        console.error("Failed to store webhook log:", logError);
      }
    } catch (logStoreError) {
      console.error("Error storing webhook log:", logStoreError);
    }

    // Extract message information - this endpoint handles STATUS CALLBACKS only
    const { MessageSid, MessageStatus, EventType, ErrorCode, ErrorMessage, From, To, Body, ApiVersion, AccountSid } = data;

    if (ErrorCode) {
      console.error("Twilio webhook error - Code:", ErrorCode, "Message:", ErrorMessage);
    }

    // Determine the actual status - WhatsApp read receipts use EventType instead of MessageStatus
    let actualStatus = MessageStatus;
    
    // Handle WhatsApp read receipts
    if (EventType === "READ") {
      actualStatus = "read";
    }

    // Validate that this is a status callback
    if (!MessageStatus && !EventType) {
      return new NextResponse("OK", { status: 200 });
    }

    // Handle failed and undelivered messages with error logging
    if (actualStatus === "failed" || actualStatus === "undelivered") {
      console.error(`Message ${actualStatus} - SID: ${MessageSid}`, ErrorMessage ? `Error: ${ErrorMessage}` : "");
    }

    // Map Twilio status to internal status
    const internalStatus = messageStatusMap[actualStatus as keyof typeof messageStatusMap] || "pending";
    // Update campaign message status
    
    // First check if there are any messages with this SID
    const { data: allMessages, error: allError } = await supabase.from("campaign_messages").select("id, campaign_id, status, delivered_at, message_sid").eq("message_sid", MessageSid);
    
    if (allError) {
      return new NextResponse("OK", { status: 200 });
    }
    
    if (!allMessages || allMessages.length === 0) {
      return new NextResponse("OK", { status: 200 });
    }
    
    const existingMessage = allMessages[0];
    const findError = null;

    if (findError) {
      // Still return OK to prevent Twilio from retrying
      return new NextResponse("OK", { status: 200 });
    }

    // Update campaign message status
    const updateData: any = {
      status: internalStatus,
      error_message: ErrorMessage || null,
    };

    // Set timestamps based on status
    if (actualStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    } else if (actualStatus === "read") {
      updateData.read_at = new Date().toISOString();
      // If delivered_at is not set, fetch it and set it now
      if (!existingMessage.delivered_at) {
        updateData.delivered_at = new Date().toISOString();
      }
    }

    const { data: updateResult, error: updateError } = await supabase.from("campaign_messages").update(updateData).eq("message_sid", MessageSid).select();

    if (updateError) {
      console.error("❌ Error updating message status:", updateError);
    }

    // Update campaign analytics if message is delivered, read, or failed
    if (actualStatus === "delivered" || actualStatus === "read" || actualStatus === "failed") {
      await updateCampaignAnalytics(supabase, existingMessage.campaign_id);
    }

    // Return 200 OK to Twilio
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("💥 WEBHOOK ERROR:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
    // Still return 200 to prevent Twilio from retrying
    return new NextResponse("OK", { status: 200 });
  }
}

// Update campaign analytics based on message statuses
async function updateCampaignAnalytics(supabase: any, campaignId: string) {
  // Get message counts
  const { data: stats } = await supabase.from("campaign_messages").select("status").eq("campaign_id", campaignId);

  if (!stats) {
    return;
  }

  const counts = stats.reduce((acc: any, msg: any) => {
    acc[msg.status] = (acc[msg.status] || 0) + 1;
    return acc;
  }, {});

  const totalSent = stats.length;
  const totalDelivered = counts.delivered || 0;
  const totalRead = counts.read || 0;
  const totalFailed = counts.failed || 0;

  // Calculate rates
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100 * 100) / 100 : 0;
  const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100 * 100) / 100 : 0;

  // Update analytics
  const { error: analyticsError } = await supabase.from("campaign_analytics").upsert({
    campaign_id: campaignId,
    total_sent: totalSent,
    total_delivered: totalDelivered,
    total_read: totalRead,
    total_failed: totalFailed,
    delivery_rate: deliveryRate,
    read_rate: readRate,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'campaign_id'
  });

  if (analyticsError) {
    console.error("❌ Error updating campaign analytics:", analyticsError);
  }

  // Check if campaign is completed
  const pendingCount = counts.pending || 0;
  const sentCount = counts.sent || 0;

  if (pendingCount === 0 && sentCount === 0) {
    // All messages have been processed
    const { error: statusError } = await supabase
      .from("campaigns")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (statusError) {
      console.error("❌ Error updating campaign status to completed:", statusError);
    }
  }
}

// GET endpoint for webhook verification/testing
export async function GET(request: NextRequest) {
  // Check if this is a test query
  const url = new URL(request.url);
  const test = url.searchParams.get("test");
  
  if (test === "connectivity") {
    return NextResponse.json({
      status: "success",
      message: "Webhook is reachable and responding",
      timestamp: new Date().toISOString(),
      endpoint: "/api/webhooks/twilio",
      webhookUrl: "https://webhook.dzynthesis.dev/api/webhooks/twilio",
    });
  }

  return NextResponse.json({
    message: "Twilio WhatsApp Status Webhook",
    endpoint: "/api/webhooks/twilio",
    webhookUrl: "https://webhook.dzynthesis.dev/api/webhooks/twilio",
    timestamp: new Date().toISOString(),
    status: "Active and ready to receive callbacks",
    instructions: [
      "This endpoint receives Twilio status callbacks", 
      "Configure in Twilio Console or use StatusCallback parameter", 
      "Supported statuses: queued, sent, delivered, read, failed, undelivered",
      "All callbacks are logged to console and database",
      "Add ?test=connectivity to test webhook connectivity"
    ],
  });
}
