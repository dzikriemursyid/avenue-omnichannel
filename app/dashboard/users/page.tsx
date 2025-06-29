import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { getAllUsers, getAllTeams, isAdmin } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { UserManagement } from "@/components/user-management"

export default async function UsersPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)
  if (!profile) {
    redirect("/")
  }

  // Check if user is admin
  const adminCheck = await isAdmin(user.id)
  if (!adminCheck) {
    redirect("/dashboard")
  }

  const [users, teams] = await Promise.all([getAllUsers(), getAllTeams()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage users, roles, and team assignments.</p>
      </div>

      <UserManagement users={users} teams={teams} />
    </div>
  )
}
