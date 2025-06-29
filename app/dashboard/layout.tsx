import type React from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Footer } from "@/components/footer"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // If Supabase is not configured, redirect to setup
  if (!isSupabaseConfigured) {
    redirect("/")
  }

  // Get the user from the server
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile
  const profile = await getUserProfile(user.id)

  if (!profile) {
    redirect("/")
  }

  return (
    <SidebarProvider>
      <AppSidebar user={profile} />
      <SidebarInset className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 h-16 shrink-0 items-center gap-2 bg-white transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b">
          <div className="flex items-center gap-2 px-4 pt-4 transition-[padding] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:pt-2 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <BreadcrumbNav />
          </div>
        </header>
        <div className="flex flex-1 flex-col g-4 pt-0-4 p-6 min-h-0 overflow-auto">
          <div className="w-full max-w-full">{children}</div>
        </div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
