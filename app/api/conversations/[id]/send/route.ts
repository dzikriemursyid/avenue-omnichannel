import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

// Twilio client setup
const twilioClient = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper function to get default content type
const getDefaultContentType = (messageType: string): string => {
  switch (messageType) {
    case "image": return "image/jpeg";
    case "video": return "video/mp4";
    case "audio": return "audio/mpeg";
    case "document": return "application/pdf";
    default: return "text/plain";
  }
};

// Helper function to get expected content type prefix
function getContentTypePrefix(messageType: string): string | null {
  switch (messageType) {
    case "image": return "image/";
    case "video": return "video/";
    case "audio": return "audio/";
    case "document": return null; // Documents can have various content types
    default: return null;
  }
}

// Request validation schema with enhanced media validation
const sendMessageSchema = z.object({
  message: z.string().min(1, "Message content is required"),
  message_type: z.enum(["text", "image", "document", "audio", "video"]).default("text"),
  media_url: z.string().url().optional(),
  media_content_type: z.string().optional(),
}).refine(
  (data) => {
    // If message_type is not text, media_url should be provided
    if (data.message_type !== "text" && !data.media_url) {
      return false;
    }
    return true;
  },
  {
    message: "Media URL is required for non-text message types",
    path: ["media_url"],
  }
).refine(
  (data) => {
    // Validate media content type matches message type
    if (data.media_url && data.media_content_type) {
      const expectedPrefix = getContentTypePrefix(data.message_type);
      if (expectedPrefix && !data.media_content_type.startsWith(expectedPrefix)) {
        return false;
      }
    }
    return true;
  },
  {
    message: "Media content type doesn't match message type",
    path: ["media_content_type"],
  }
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = sendMessageSchema.parse(body);

    // Get conversation details with contact info and window status
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select(`
        id,
        status,
        contact_id,
        is_within_window,
        conversation_window_expires_at,
        contacts!inner (
          id,
          phone_number,
          name
        )
      `)
      .eq("id", conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.status === "closed") {
      return NextResponse.json({ 
        error: "Cannot send message to closed conversation", 
        details: "This conversation has been closed due to 24-hour inactivity. Customer must send a new message to reopen.",
        code: "CONVERSATION_CLOSED"
      }, { status: 400 });
    }

    // Check if conversation window has expired
    if (!conversation.is_within_window) {
      return NextResponse.json({ 
        error: "Cannot send message - conversation window expired", 
        details: "24-hour conversation window has expired. Only template messages are allowed.",
        code: "WINDOW_EXPIRED"
      }, { status: 400 });
    }

    const contact = conversation.contacts;
    const toNumber = `whatsapp:${contact.phone_number}`;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+628979118504";

    // Send message via Twilio with enhanced error handling
    let twilioMessage;
    try {
      const messageData: any = {
        from: fromNumber,
        to: toNumber,
        body: validatedData.message,
      };

      // Add media if provided with validation
      if (validatedData.media_url && validatedData.message_type !== "text") {
        // Validate media URL accessibility (basic check)
        try {
          const urlCheck = new URL(validatedData.media_url);
          if (!['http:', 'https:'].includes(urlCheck.protocol)) {
            throw new Error('Invalid media URL protocol');
          }
        } catch (urlError) {
          console.error("❌ Invalid media URL:", urlError);
          return NextResponse.json(
            { error: "Invalid media URL format", details: "Media URL must be a valid HTTP/HTTPS URL" },
            { status: 400 }
          );
        }
        
        messageData.mediaUrl = [validatedData.media_url];
        console.log(`📎 Sending ${validatedData.message_type} message with media: ${validatedData.media_url.substring(0, 50)}...`);
      }

      twilioMessage = await twilioClient.messages.create(messageData);
      console.log(`✅ Twilio message created with SID: ${twilioMessage.sid}`);
      
    } catch (twilioError: any) {
      console.error("❌ Twilio send error:", twilioError);
      
      // Enhanced error handling for different Twilio error types
      let errorMessage = "Failed to send message";
      let statusCode = 500;
      
      if (twilioError.code) {
        switch (twilioError.code) {
          case 21408:
            errorMessage = "Permission to send media is not enabled for this number";
            statusCode = 403;
            break;
          case 21623:
            errorMessage = "Media file size exceeds limit (20MB)";
            statusCode = 400;
            break;
          case 21624:
            errorMessage = "Media file type not supported by WhatsApp";
            statusCode = 400;
            break;
          case 21610:
            errorMessage = "Message cannot be sent to this WhatsApp number";
            statusCode = 400;
            break;
          case 21614:
            errorMessage = "Message body is required when not sending media";
            statusCode = 400;
            break;
          case 63016:
            errorMessage = "Media URL could not be accessed or downloaded";
            statusCode = 400;
            break;
          case 63017:
            errorMessage = "Media file is corrupted or invalid";
            statusCode = 400;
            break;
          case 30008:
            errorMessage = "Unknown WhatsApp recipient - number may not be registered";
            statusCode = 400;
            break;
          default:
            errorMessage = twilioError.message || "Failed to send message";
        }
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          code: twilioError.code,
          details: twilioError.message,
          moreInfo: twilioError.moreInfo 
        },
        { status: statusCode }
      );
    }

    // Store outbound message in database using service client
    const messageRecord = {
      conversation_id: conversationId,
      message_sid: twilioMessage.sid,
      direction: "outbound" as const,
      message_type: validatedData.message_type,
      content: validatedData.message,
      media_url: validatedData.media_url || null,
      media_content_type: validatedData.media_content_type || (validatedData.message_type !== "text" ? getDefaultContentType(validatedData.message_type) : null),
      from_number: fromNumber,
      to_number: toNumber,
      sent_by: user.id,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data: savedMessage, error: messageError } = await serviceSupabase
      .from("messages")
      .insert(messageRecord)
      .select()
      .single();

    if (messageError) {
      console.error("❌ Error saving outbound message:", messageError);
      // Don't fail the request if message was sent but saving failed
    }

    // Update conversation last_message_at
    const { error: updateError } = await serviceSupabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        status: "open", // Ensure conversation is open
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("❌ Error updating conversation:", updateError);
    }

    console.log(`✅ Message sent to ${contact.name} (${contact.phone_number}):`, validatedData.message);

    return NextResponse.json({
      success: true,
      message: {
        id: savedMessage?.id,
        message_sid: twilioMessage.sid,
        content: validatedData.message,
        direction: "outbound",
        message_type: validatedData.message_type,
        timestamp: messageRecord.timestamp,
        sent_by: user.id,
      },
      twilio: {
        sid: twilioMessage.sid,
        status: twilioMessage.status,
      },
    });

  } catch (error: any) {
    console.error("❌ Send message error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve conversation messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get conversation with messages and window status
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select(`
        id,
        status,
        priority,
        last_message_at,
        created_at,
        is_within_window,
        conversation_window_expires_at,
        last_customer_message_at,
        contacts!inner (
          id,
          name,
          phone_number,
          profile_picture_url
        )
      `)
      .eq("id", conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Get messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(`
        id,
        message_sid,
        direction,
        message_type,
        content,
        media_url,
        media_content_type,
        timestamp,
        created_at,
        sent_by,
        profiles (
          full_name
        )
      `)
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: true });

    if (messagesError) {
      console.error("❌ Error fetching messages:", messagesError);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        contact: conversation.contacts,
      },
      messages: messages || [],
    });

  } catch (error: any) {
    console.error("❌ Get conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}