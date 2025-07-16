// Proxy endpoint untuk mengakses Twilio media dengan authentication
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const supabase = await createClient();
    
    // Get current user for auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get message with media URL
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("media_url, media_content_type, conversation_id")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (!message.media_url) {
      return NextResponse.json({ error: "No media found for this message" }, { status: 404 });
    }

    // Verify user has access to this conversation
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", message.conversation_id)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch media from Twilio with authentication
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const mediaResponse = await fetch(message.media_url, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!mediaResponse.ok) {
      console.error(`❌ Failed to fetch media: ${mediaResponse.status}`);
      return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
    }

    // Get media data
    const mediaBuffer = await mediaResponse.arrayBuffer();
    
    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', message.media_content_type || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    headers.set('Content-Length', mediaBuffer.byteLength.toString());

    return new NextResponse(mediaBuffer, {
      status: 200,
      headers: headers
    });

  } catch (error: any) {
    console.error("❌ Media proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}