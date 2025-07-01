import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import Analytics from "@/components/analytics"

// Mock analytics data based on role
const getAnalyticsData = (role: string) => {
  const baseData = {
    personal: {
      conversations_handled: 45,
      messages_sent: 234,
      avg_response_time: 2.3,
      customer_satisfaction: 4.7,
      resolution_rate: 89,
    },
  }

  if (role === "agent") return baseData

  return {
    ...baseData,
    team: {
      team_conversations: 156,
      team_messages: 892,
      team_avg_response: 3.1,
      team_satisfaction: 4.5,
      active_agents: 8,
    },
    ...(role === "general_manager" || role === "admin"
      ? {
        global: {
          total_conversations: 1247,
          total_messages: 5634,
          global_avg_response: 2.8,
          global_satisfaction: 4.6,
          total_teams: 5,
          total_agents: 23,
        },
      }
      : {}),
  }
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)
  if (!profile || !hasPermission(profile.role, "view_analytics")) {
    redirect("/dashboard")
  }

  const analytics = getAnalyticsData(profile.role)

  return <Analytics profile={profile} analytics={analytics} />
}
