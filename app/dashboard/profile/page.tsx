import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileOptimized } from "@/components/dashboard/profile-optimized"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // No need to fetch profile here since ProfileOptimized handles it via hooks
  return <ProfileOptimized />
}
