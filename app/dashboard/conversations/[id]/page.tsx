import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { ChatRoom } from "@/components/dashboard/chat-room"

interface ConversationPageProps {
  params: {
    id: string
  }
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)
  if (!profile || !hasPermission(profile.role, "view_conversations")) {
    redirect("/dashboard")
  }

  // Mock conversation data - replace with real data from Supabase
  const conversation = {
    id: params.id,
    contact: {
      id: "contact-1",
      name: "John Doe",
      phone_number: "+1234567890",
      profile_picture_url: null,
    },
    status: "open" as const,
    priority: "normal" as const,
    assigned_agent: profile.role === "agent" ? profile.full_name : "Sarah Wilson",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    last_message_at: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  }

  // Mock messages data
  const messages = [
    {
      id: "1",
      conversation_id: params.id,
      direction: "inbound" as const,
      message_type: "text" as const,
      content: "Hi, I need help with my recent order",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      sent_by: null,
    },
    {
      id: "2",
      conversation_id: params.id,
      direction: "outbound" as const,
      message_type: "text" as const,
      content: "Hello! I'd be happy to help you with your order. Could you please provide me with your order number?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 2),
      sent_by: profile.id,
    },
    {
      id: "3",
      conversation_id: params.id,
      direction: "inbound" as const,
      message_type: "text" as const,
      content: "Sure, my order number is #12345",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 5),
      sent_by: null,
    },
    {
      id: "4",
      conversation_id: params.id,
      direction: "outbound" as const,
      message_type: "text" as const,
      content:
        "Thank you! I can see your order here. It looks like it's currently being processed and should ship within the next 24 hours. You'll receive a tracking number via email once it's dispatched.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 7),
      sent_by: profile.id,
    },
    {
      id: "5",
      conversation_id: params.id,
      direction: "inbound" as const,
      message_type: "text" as const,
      content: "Perfect! Thank you for the quick response. One more question - can I change the delivery address?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
      sent_by: null,
    },
    {
      id: "6",
      conversation_id: params.id,
      direction: "outbound" as const,
      message_type: "text" as const,
      content:
        "I can help you with that! Since your order hasn't shipped yet, we can still update the delivery address. What's the new address you'd like to use?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1 + 1000 * 60 * 3),
      sent_by: profile.id,
    },
    {
      id: "7",
      conversation_id: params.id,
      direction: "inbound" as const,
      message_type: "text" as const,
      content: "The new address is: 123 Main Street, Apt 4B, New York, NY 10001",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
      sent_by: null,
    },
    {
      id: "8",
      conversation_id: params.id,
      direction: "outbound" as const,
      message_type: "text" as const,
      content:
        "Great! I've updated your delivery address to 123 Main Street, Apt 4B, New York, NY 10001. The change has been applied to your order #12345. Is there anything else I can help you with today?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12 + 1000 * 60 * 2),
      sent_by: profile.id,
    },
    {
      id: "9",
      conversation_id: params.id,
      direction: "inbound" as const,
      message_type: "text" as const,
      content: "That's all for now. Thank you so much for your help!",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      sent_by: null,
    },
  ]

  return <ChatRoom conversation={conversation} messages={messages} currentUser={profile} />
}
