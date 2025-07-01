import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { redirect } from "next/navigation"
import Dashboard from "@/components/dashboard"

async function getDashboardStats(userId: string) {
  const supabase = await createClient()

  // Get basic counts (you can expand this based on user role and permissions)
  const [contactsResult, conversationsResult, campaignsResult] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("campaigns").select("id", { count: "exact", head: true }),
  ])

  return {
    contacts: contactsResult.count || 0,
    conversations: conversationsResult.count || 0,
    campaigns: campaignsResult.count || 0,
    messages: 0, // You can add this query
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)
  if (!profile) {
    redirect("/auth/login")
  }

  const stats = await getDashboardStats(user.id)

  return <Dashboard profile={profile} stats={stats} />
}
