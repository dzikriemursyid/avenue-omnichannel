import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { getAllUsers, getAllTeams } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { UserManagement } from "./user-management"

export default async function UsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const currentUser = await getUserProfile(user.id)
  if (!currentUser) {
    redirect("/auth/setup-profile")
  }

  // Check permissions
  if (currentUser.role !== "admin") {
    redirect("/dashboard")
  }

  // Fetch data
  const [users, teams] = await Promise.all([
    getAllUsers(),
    getAllTeams()
  ])

  return <UserManagement users={users} teams={teams} currentUser={currentUser} />
}

