import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { getTeamsForUser } from "@/lib/supabase/teams"
import { redirect } from "next/navigation"
import { TeamManagement } from "@/components/dashboard/team-management"

export default async function TeamsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)
  if (!profile || !hasPermission(profile.role, "view_teams")) {
    redirect("/dashboard")
  }

  // Fetch teams based on user role
  const teams = await getTeamsForUser(user.id, profile.role)
  const canCreateTeam = ["admin", "general_manager"].includes(profile.role)
  const canDeleteTeam = ["admin", "general_manager"].includes(profile.role)

  return (
    <TeamManagement
      teams={teams}
      currentUser={profile}
      canCreateTeam={canCreateTeam}
      canDeleteTeam={canDeleteTeam}
    />
  )
}
