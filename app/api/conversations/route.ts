import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
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

    // Build query based on user role
    let query = supabase
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
      `);

    // Since we removed assigned_agent_id, show all conversations for now
    // Role-based filtering can be re-implemented later if needed

    // Execute query with ordering
    const { data: conversations, error: conversationsError } = await query
      .order("last_message_at", { ascending: false });

    if (conversationsError) {
      console.error("❌ Error fetching conversations:", conversationsError);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }

    // Get last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conversation) => {
        // Get the latest message for this conversation
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("content, timestamp, direction")
          .eq("conversation_id", conversation.id)
          .order("timestamp", { ascending: false })
          .limit(1)
          .single();

        // Count unread messages (for now, we'll assume all inbound messages are unread)
        // This can be enhanced later with a proper read status system
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("id", { count: "exact" })
          .eq("conversation_id", conversation.id)
          .eq("direction", "inbound")
          .gte("timestamp", conversation.last_message_at);

        return {
          id: conversation.id,
          contact_name: conversation.contacts.name,
          phone_number: conversation.contacts.phone_number,
          profile_picture_url: conversation.contacts.profile_picture_url,
          last_message: lastMessage?.content || "No messages yet",
          last_message_at: conversation.last_message_at,
          status: conversation.status,
          priority: conversation.priority,
          unread_count: unreadCount || 0,
          created_at: conversation.created_at,
          is_within_window: conversation.is_within_window,
          conversation_window_expires_at: conversation.conversation_window_expires_at,
          last_customer_message_at: conversation.last_customer_message_at,
        };
      })
    );

    return NextResponse.json({
      conversations: conversationsWithLastMessage,
      total: conversationsWithLastMessage.length,
      stats: {
        open: conversationsWithLastMessage.filter(c => c.status === "open").length,
        pending: conversationsWithLastMessage.filter(c => c.status === "pending").length,
        closed: conversationsWithLastMessage.filter(c => c.status === "closed").length,
        total_unread: conversationsWithLastMessage.reduce((sum, c) => sum + c.unread_count, 0),
      }
    });

  } catch (error: any) {
    console.error("❌ Conversations API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}