import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import Conversation from "@/components/dashboard/conversation"

export default async function ConversationsPage() {
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
  const conversations = [
    {
      id: "1",
      contact_name: "John Doe",
      phone_number: "+1234567890",
      last_message: "Thank you for your help!",
      last_message_at: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      status: "open" as const,
      priority: "normal" as const,
      assigned_agent: profile.role === "agent" ? profile.full_name : "Sarah Wilson",
      unread_count: 2,
    },
    {
      id: "2",
      contact_name: "Jane Smith",
      phone_number: "+1234567891",
      last_message: "I need help with my order",
      last_message_at: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      status: "pending" as const,
      priority: "high" as const,
      assigned_agent: profile.role === "agent" ? profile.full_name : "Mike Johnson",
      unread_count: 5,
    },
    {
      id: "3",
      contact_name: "Bob Wilson",
      phone_number: "+1234567892",
      last_message: "Perfect, thanks!",
      last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      status: "closed" as const,
      priority: "low" as const,
      assigned_agent: profile.role === "agent" ? profile.full_name : "Lisa Chen",
      unread_count: 0,
    },
  ]

  return <Conversation profile={profile} conversations={conversations} />
}
