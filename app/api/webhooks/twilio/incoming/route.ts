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
    console.log("\n=== Incoming WhatsApp Message Received ===");
    console.log("Timestamp:", new Date().toISOString());

    const supabase = createServiceClient();
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

    // Business logic for processing incoming messages (text or media)
    const hasContent = Body || (NumMedia && parseInt(NumMedia) > 0);
    
    if (hasContent) {
      if (Body) {
        console.log(`💬 Text message from ${ProfileName || WaId}: "${Body}"`);
      } else if (NumMedia && parseInt(NumMedia) > 0) {
        console.log(`📸 Media message from ${ProfileName || WaId} (${NumMedia} attachment(s))`);
      }

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
            return new NextResponse("OK", { status: 200 });
          } else {
            contact = newContact;
            console.log("✅ Created new contact:", contact.id);
          }
        }

        // Find or create conversation for this contact
        // Note: Customer message can reopen closed conversations (24-hour window policy)
        let conversation;
        const { data: existingConversation } = await supabase
          .from("conversations")
          .select("id, contact_id, status")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existingConversation) {
          conversation = existingConversation;
          console.log(`✅ Found existing conversation: ${conversation.id} (Status: ${conversation.status})`);
          
          // If conversation was closed, it will be reopened by the database trigger
          // The trigger automatically updates status to 'open' and resets the window
          if (conversation.status === "closed") {
            console.log("🔄 Conversation will be reopened by database trigger (24-hour window reset)");
          }
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

        // Store the incoming message with enhanced media handling
        if (conversation) {
          // Parse media information - handle multiple media attachments
          let messageType = "text";
          let mediaUrl = null;
          let mediaContentType = null;
          let mediaAttachments = [];

          const numMedia = NumMedia ? parseInt(NumMedia) : 0;

          if (numMedia > 0) {
            console.log(`📎 Processing ${numMedia} media attachment(s)`);
            
            // Process all media attachments
            for (let i = 0; i < numMedia; i++) {
              const mediaUrlKey = i === 0 ? 'MediaUrl0' : `MediaUrl${i}`;
              const mediaContentTypeKey = i === 0 ? 'MediaContentType0' : `MediaContentType${i}`;
              
              const currentMediaUrl = data[mediaUrlKey];
              const currentMediaContentType = data[mediaContentTypeKey];
              
              if (currentMediaUrl && currentMediaContentType) {
                // Validate media content type
                const isValidMediaType = [
                  'image/', 'video/', 'audio/', 'application/pdf', 
                  'application/msword', 'application/vnd.openxmlformats-officedocument',
                  'text/plain', 'text/csv'
                ].some(type => currentMediaContentType.startsWith(type));
                
                if (isValidMediaType) {
                  // Get authenticated media URL
                  const authenticatedUrl = await getAuthenticatedMediaUrl(currentMediaUrl);
                  
                  if (authenticatedUrl) {
                    mediaAttachments.push({
                      url: authenticatedUrl,
                      contentType: currentMediaContentType,
                      messageType: getMediaMessageType(currentMediaContentType)
                    });
                    
                    console.log(`  Media ${i + 1}: ${currentMediaContentType} - ${authenticatedUrl.substring(0, 50)}...`);
                  } else {
                    console.log(`  ❌  Media ${i + 1} URL not accessible: ${currentMediaUrl.substring(0, 50)}...`);
                  }
                } else {
                  console.log(`  ⚠️  Unsupported media type: ${currentMediaContentType}`);
                }
              }
            }

            // Use the first valid media attachment for primary message
            if (mediaAttachments.length > 0) {
              const primaryMedia = mediaAttachments[0];
              mediaUrl = primaryMedia.url;
              mediaContentType = primaryMedia.contentType;
              messageType = primaryMedia.messageType;
              
              console.log(`✅ Primary media: ${messageType} (${mediaContentType})`);
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

          const { error: messageError } = await supabase.from("messages").insert(messageData);

          if (messageError) {
            console.error("❌ Error storing message:", messageError);
          } else {
            console.log(`✅ Message stored successfully (Type: ${messageType})`);
            if (mediaAttachments.length > 1) {
              console.log(`ℹ️  Note: ${mediaAttachments.length - 1} additional media attachment(s) not stored (single media per message supported)`);
            }
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
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Incoming webhook error:", error);
    // Still return 200 to prevent Twilio from retrying
    return new NextResponse("OK", { status: 200 });
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
    case "image": return "🖼️";
    case "video": return "🎥";
    case "audio": return "🎵";
    case "document": return "📄";
    default: return "📎";
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
      console.error('❌ Missing Twilio credentials');
      return mediaUrl; // Return original URL as fallback
    }

    // Twilio media URLs are accessible with basic auth
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Basic ${auth}`
      },
      method: 'HEAD' // Just check if accessible
    });

    if (response.ok) {
      console.log('✅ Media URL is accessible with authentication');
      return mediaUrl; // Return original URL since it's accessible
    } else {
      console.error('❌ Media URL not accessible:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error validating media URL:', error);
    return mediaUrl; // Return original URL as fallback
  }
}

export async function GET(request: NextRequest) {
  console.log("🔍 GET request to incoming webhook endpoint");

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
      "Enhanced logging and error handling"
    ],
    supportedMediaTypes: [
      "image/*", "video/*", "audio/*", "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.*",
      "text/plain", "text/csv"
    ],
    instructions: ["Configure in Twilio Console WhatsApp sandbox", 'Set as "When a message comes in" webhook URL'],
  });
}
