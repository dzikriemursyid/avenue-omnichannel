import type React from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

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
  const supabase = createClient()
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
      <SidebarInset className="min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0 overflow-auto">
          <div className="w-full max-w-full">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
