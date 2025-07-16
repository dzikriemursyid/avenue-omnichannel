import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { ChatRoom } from "@/components/dashboard/chat-room"

interface ConversationPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  // Await params to fix Next.js 15 async params issue
  const { id } = await params
  
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

  // Verify conversation exists and user has access
  let query = supabase
    .from("conversations")
    .select(`
      id,
      status,
      priority,
      created_at,
      last_message_at,
      assigned_agent_id,
      contacts!inner (
        id,
        name,
        phone_number,
        profile_picture_url
      )
    `)
    .eq("id", id)

  // Apply role-based filtering
  switch (profile.role) {
    case "agent":
      query = query.eq("assigned_agent_id", profile.id)
      break
    case "leader":
      if (profile.team_id) {
        query = query.eq("team_id", profile.team_id)
      }
      break
    case "general_manager":
    case "admin":
      // No additional filtering needed
      break
    default:
      redirect("/dashboard")
  }

  const { data: conversation, error: conversationError } = await query.single()

  if (conversationError || !conversation) {
    console.error("Conversation not found or access denied:", conversationError)
    redirect("/dashboard/conversations")
  }

  return <ChatRoom conversationId={id} currentUser={profile} />
}
