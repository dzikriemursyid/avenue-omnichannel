import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { redirect } from "next/navigation"
import { UserManagementOptimized } from "@/components/dashboard/user-management-optimized"

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

  return <UserManagementOptimized currentUser={currentUser} />
}
