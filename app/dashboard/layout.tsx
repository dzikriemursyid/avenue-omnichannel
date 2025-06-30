import type React from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Footer } from "@/components/footer"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)
  if (!profile) {
    redirect("/auth/setup-profile")
  }

  if (!profile.is_active) {
    redirect("/auth/suspended")
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
