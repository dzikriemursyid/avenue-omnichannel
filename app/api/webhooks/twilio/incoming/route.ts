// Twilio Incoming WhatsApp Message Handler
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

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
    const supabase = createServiceClient();
    const data = await parseFormData(request);

    console.log("📨 Incoming webhook data:", JSON.stringify(data, null, 2));

    // Extract key information for incoming messages
    const { MessageSid, From, To, Body, MediaUrl0, MediaContentType0, NumMedia, ProfileName, WaId, SmsMessageSid, ApiVersion, AccountSid } = data;

    console.log("📋 Parsed webhook fields:", {
      MessageSid,
      From,
      To, 
      Body,
      NumMedia,
      ProfileName,
      WaId
    });

    // Business logic for processing incoming messages (text or media)
    const hasContent = Body || (NumMedia && parseInt(NumMedia) > 0);

    console.log("🔍 Has content:", hasContent);

    if (hasContent) {
      // Extract phone number from WhatsApp format
      const phoneNumber = From.replace("whatsapp:", "");
      
      console.log("📞 Processing message from phone:", phoneNumber);

      try {
        // Find or create contact first
        let contact;
        console.log("🔍 Looking for existing contact...");
        const { data: existingContact, error: contactLookupError } = await supabase
          .from("contacts")
          .select("id, name")
          .eq("phone_number", phoneNumber)
          .single();
          
        if (contactLookupError && contactLookupError.code !== 'PGRST116') {
          console.error("❌ Error looking up contact:", contactLookupError);
        }

        if (existingContact) {
          contact = existingContact;
          console.log("✅ Found existing contact:", contact.id, contact.name);
        } else {
          console.log("➕ Creating new contact...");
          // Create new contact with system/webhook user
          const { data: newContact, error: contactError } = await supabase
            .from("contacts")
            .insert({
              phone_number: phoneNumber,
              name: ProfileName || WaId || phoneNumber,
              last_interaction_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              created_by: null, // System created via webhook
            })
            .select()
            .single();

          if (contactError) {
            console.error("❌ Error creating contact:", contactError);
            return new NextResponse("", { status: 200 });
          } else {
            contact = newContact;
            console.log("✅ Created new contact:", contact.id, contact.name);
          }
        }

        // Find or create conversation for this contact
        // Note: Customer message can reopen closed conversations (24-hour window policy)
        let conversation;
        console.log("🔍 Looking for existing conversation for contact:", contact.id);
        const { data: existingConversation, error: conversationLookupError } = await supabase
          .from("conversations")
          .select("id, contact_id, status, visibility_status, created_by_campaign")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
          
        if (conversationLookupError && conversationLookupError.code !== 'PGRST116') {
          console.error("❌ Error looking up conversation:", conversationLookupError);
        }

        if (existingConversation) {
          conversation = existingConversation;
          console.log("✅ Found existing conversation:", {
            id: existingConversation.id,
            status: existingConversation.status,
            visibility_status: existingConversation.visibility_status,
            created_by_campaign: existingConversation.created_by_campaign
          });

          // CONVERSATION ACTIVATION LOGIC: If conversation is dormant (from campaign), activate it
          if (existingConversation.visibility_status === 'dormant') {
            console.log(`🔄 Activating dormant conversation ${existingConversation.id} - customer replied to campaign`);
            
            const { error: activationError } = await supabase
              .from("conversations")
              .update({
                visibility_status: "active", // Make visible in main UI
                updated_at: new Date().toISOString()
              })
              .eq("id", existingConversation.id);
              
            if (activationError) {
              console.error("❌ Error activating conversation:", activationError);
            } else {
              console.log(`✅ Successfully activated conversation ${existingConversation.id} from campaign ${existingConversation.created_by_campaign}`);
            }
          } else {
            console.log(`ℹ️ Conversation ${existingConversation.id} is already ${existingConversation.visibility_status}`);
          }

          // If conversation was closed, it will be reopened by the database trigger
          // The trigger automatically updates status to 'open' and resets the window
        } else {
          // Create new conversation (customer-initiated, so active)
          const { data: newConversation, error: conversationError } = await supabase
            .from("conversations")
            .insert({
              contact_id: contact.id,
              status: "open",
              priority: "normal",
              last_message_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              visibility_status: "active", // Customer-initiated conversations are always active
            })
            .select()
            .single();

          if (conversationError) {
            console.error("❌ Error creating conversation:", conversationError);
            return new NextResponse("", { status: 200 });
          } else {
            conversation = newConversation;
          }
        }

        // Store the incoming message with enhanced media handling
        if (conversation) {
          // Parse media information - handle multiple media attachments
          let messageType = "text";
          let mediaUrl = null;
          let mediaContentType = null;
          let mediaAttachments = [];

          const numMedia = NumMedia ? parseInt(NumMedia) : 0;

          if (numMedia > 0) {
            // Process all media attachments
            for (let i = 0; i < numMedia; i++) {
              const mediaUrlKey = i === 0 ? "MediaUrl0" : `MediaUrl${i}`;
              const mediaContentTypeKey = i === 0 ? "MediaContentType0" : `MediaContentType${i}`;

              const currentMediaUrl = data[mediaUrlKey];
              const currentMediaContentType = data[mediaContentTypeKey];

              if (currentMediaUrl && currentMediaContentType) {
                // Validate media content type
                const isValidMediaType = ["image/", "video/", "audio/", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument", "text/plain", "text/csv"].some((type) =>
                  currentMediaContentType.startsWith(type)
                );

                if (isValidMediaType) {
                  // Get authenticated media URL
                  const authenticatedUrl = await getAuthenticatedMediaUrl(currentMediaUrl);

                  if (authenticatedUrl) {
                    mediaAttachments.push({
                      url: authenticatedUrl,
                      contentType: currentMediaContentType,
                      messageType: getMediaMessageType(currentMediaContentType),
                    });
                  } else {
                    console.error(`Media ${i + 1} URL not accessible: ${currentMediaUrl.substring(0, 50)}...`);
                  }
                } else {
                  console.error(`Unsupported media type: ${currentMediaContentType}`);
                }
              }
            }

            // Use the first valid media attachment for primary message
            if (mediaAttachments.length > 0) {
              const primaryMedia = mediaAttachments[0];
              mediaUrl = primaryMedia.url;
              mediaContentType = primaryMedia.contentType;
              messageType = primaryMedia.messageType;
            }
          }

          // Generate appropriate content for different message types
          let messageContent = Body;
          if (!messageContent && mediaAttachments.length > 0) {
            messageContent = `${getMediaEmoji(messageType)} ${messageType.charAt(0).toUpperCase() + messageType.slice(1)} message`;
          } else if (!messageContent && messageType !== "text") {
            messageContent = `${getMediaEmoji(messageType)} ${messageType.charAt(0).toUpperCase() + messageType.slice(1)} message`;
          } else if (!messageContent) {
            messageContent = "Message received"; // Fallback
          }

          const messageData = {
            conversation_id: conversation.id,
            message_sid: MessageSid,
            direction: "inbound",
            message_type: messageType,
            content: messageContent,
            media_url: mediaUrl,
            media_content_type: mediaContentType,
            from_number: From,
            to_number: To,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };

          console.log("💾 Inserting message data:", JSON.stringify(messageData, null, 2));
          
          const { data: insertedMessage, error: messageError } = await supabase
            .from("messages")
            .insert(messageData)
            .select()
            .single();

          if (messageError) {
            console.error("❌ Error storing message:", messageError);
            console.error("❌ Message data that failed:", JSON.stringify(messageData, null, 2));
          } else {
            console.log("✅ Successfully stored message:", insertedMessage?.id);
          }

          // Update conversation last_message_at (window updates handled by trigger)
          const { error: updateError } = await supabase
            .from("conversations")
            .update({
              last_message_at: new Date().toISOString(),
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
    return new NextResponse("", { status: 200 });
  } catch (error) {
    console.error("❌ Incoming webhook error:", error);
    // Still return 200 to prevent Twilio from retrying
    return new NextResponse("", { status: 200 });
  }
}

// GET endpoint for webhook verification/testing
// Helper function to determine message type from content type
function getMediaMessageType(contentType: string): string {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  return "document";
}

// Helper function to get emoji for media type
function getMediaEmoji(messageType: string): string {
  switch (messageType) {
    case "image":
      return "🖼️";
    case "video":
      return "🎥";
    case "audio":
      return "🎵";
    case "document":
      return "📄";
    default:
      return "📎";
  }
}

// Helper function to validate media file size (if provided in headers)
function isValidMediaSize(contentLength: string | null): boolean {
  if (!contentLength) return true; // Allow if size unknown
  const sizeInMB = parseInt(contentLength) / (1024 * 1024);
  return sizeInMB <= 20; // Max 20MB per Twilio limits
}

// Helper function to get authenticated media URL
async function getAuthenticatedMediaUrl(mediaUrl: string): Promise<string | null> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.error("❌ Missing Twilio credentials");
      return mediaUrl; // Return original URL as fallback
    }

    // Twilio media URLs are accessible with basic auth
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      method: "HEAD", // Just check if accessible
    });

    if (response.ok) {
      return mediaUrl; // Return original URL since it's accessible
    } else {
      console.error("Media URL not accessible:", response.status);
      return null;
    }
  } catch (error) {
    console.error("Error validating media URL:", error);
    return mediaUrl; // Return original URL as fallback
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Twilio WhatsApp Incoming Message Webhook",
    endpoint: "/api/webhooks/twilio/incoming",
    webhookUrl: "https://webhook.dzynthesis.dev/api/webhooks/twilio/incoming",
    timestamp: new Date().toISOString(),
    features: [
      "Handles incoming WhatsApp messages",
      "Supports multiple media attachments (images, videos, audio, documents)",
      "Auto-creates contacts and conversations",
      "Media validation and type detection",
      "Enhanced logging and error handling",
    ],
    supportedMediaTypes: ["image/*", "video/*", "audio/*", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.*", "text/plain", "text/csv"],
    instructions: ["Configure in Twilio Console WhatsApp sandbox", 'Set as "When a message comes in" webhook URL'],
  });
}
