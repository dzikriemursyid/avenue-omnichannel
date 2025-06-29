import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { isAdmin } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
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

  // Check if user is admin - redirect if not
  const adminCheck = await isAdmin(user.id)
  if (!adminCheck) {
    redirect("/dashboard")
  }

  return <>{children}</>
}
