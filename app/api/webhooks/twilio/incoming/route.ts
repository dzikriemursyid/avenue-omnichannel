// Twilio Incoming WhatsApp Message Handler
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    console.log("\n=== Incoming WhatsApp Message Received ===");
    console.log("Timestamp:", new Date().toISOString());

    const supabase = await createClient();
    const data = await parseFormData(request);

    // Log all parameters sent by Twilio for debugging
    console.log("Request Body:", JSON.stringify(data, null, 2));

    // Extract key information for incoming messages
    const { MessageSid, From, To, Body, MediaUrl0, MediaContentType0, NumMedia, ProfileName, WaId, SmsMessageSid, ApiVersion, AccountSid } = data;

    console.log("Incoming Message Details:");
    console.log("  SID:", MessageSid);
    console.log("  From:", From);
    console.log("  To:", To);
    console.log("  Body:", Body);
    console.log("  Profile Name:", ProfileName);
    console.log("  WhatsApp ID:", WaId);

    // Handle media if present
    if (NumMedia && parseInt(NumMedia) > 0) {
      console.log("  Media Count:", NumMedia);
      console.log("  Media URL:", MediaUrl0);
      console.log("  Media Type:", MediaContentType0);
    }

    console.log("  Account SID:", AccountSid);
    console.log("  API Version:", ApiVersion);
    console.log("==========================================\n");

    // Business logic for processing incoming messages
    if (Body) {
      console.log(`💬 Message from ${ProfileName || WaId}: "${Body}"`);

      // Here you can add your business logic:
      // 1. Store the incoming message in conversations table
      // 2. Check for existing conversation or create new one
      // 3. Auto-reply logic (if needed)
      // 4. Notify team members
      // 5. Update conversation status

      // Extract phone number from WhatsApp format
      const phoneNumber = From.replace("whatsapp:", "");

      try {
        // Find or create contact first
        let contact;
        const { data: existingContact } = await supabase.from("contacts").select("id, name").eq("phone_number", phoneNumber).single();

        if (existingContact) {
          contact = existingContact;
          console.log("✅ Found existing contact:", contact.id);
        } else {
          // Create new contact
          const { data: newContact, error: contactError } = await supabase
            .from("contacts")
            .insert({
              phone_number: phoneNumber,
              name: ProfileName || WaId || phoneNumber,
              last_interaction_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (contactError) {
            console.error("❌ Error creating contact:", contactError);
            return new NextResponse("OK", { status: 200 });
          } else {
            contact = newContact;
            console.log("✅ Created new contact:", contact.id);
          }
        }

        // Find or create conversation for this contact
        let conversation;
        const { data: existingConversation } = await supabase.from("conversations").select("id, contact_id, status").eq("contact_id", contact.id).eq("status", "open").single();

        if (existingConversation) {
          conversation = existingConversation;
          console.log("✅ Found existing conversation:", conversation.id);
        } else {
          // Create new conversation
          const { data: newConversation, error: conversationError } = await supabase
            .from("conversations")
            .insert({
              contact_id: contact.id,
              status: "open",
              priority: "normal",
              last_message_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (conversationError) {
            console.error("❌ Error creating conversation:", conversationError);
            return new NextResponse("OK", { status: 200 });
          } else {
            conversation = newConversation;
            console.log("✅ Created new conversation:", conversation.id);
          }
        }

        // Store the incoming message
        if (conversation) {
          const messageData = {
            conversation_id: conversation.id,
            message_sid: MessageSid,
            direction: "inbound",
            message_type: NumMedia && parseInt(NumMedia) > 0 ? "media" : "text",
            content: Body || "",
            media_url: MediaUrl0 || null,
            media_content_type: MediaContentType0 || null,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };

          const { error: messageError } = await supabase.from("messages").insert(messageData);

          if (messageError) {
            console.error("❌ Error storing message:", messageError);
          } else {
            console.log("✅ Message stored successfully");
          }

          // Update conversation last_message_at
          const { error: updateError } = await supabase
            .from("conversations")
            .update({
              last_message_at: new Date().toISOString(),
              status: "open",
            })
            .eq("id", conversation.id);

          if (updateError) {
            console.error("❌ Error updating conversation:", updateError);
          }
        }
      } catch (dbError) {
        console.error("❌ Database operation failed:", dbError);
      }
    }

    // Respond to Twilio (must respond with 200 status)
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Incoming webhook error:", error);
    // Still return 200 to prevent Twilio from retrying
    return new NextResponse("OK", { status: 200 });
  }
}

// GET endpoint for webhook verification/testing
export async function GET(request: NextRequest) {
  console.log("🔍 GET request to incoming webhook endpoint");

  return NextResponse.json({
    message: "Twilio WhatsApp Incoming Message Webhook",
    endpoint: "/api/webhooks/twilio/incoming",
    webhookUrl: "https://webhook.dzynthesis.dev/api/webhooks/twilio/incoming",
    timestamp: new Date().toISOString(),
    instructions: ["This endpoint receives incoming WhatsApp messages", "Configure in Twilio Console WhatsApp sandbox", 'Set as "When a message comes in" webhook URL'],
  });
}
