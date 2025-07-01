"use client"

import type * as React from "react"
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Send,
  BarChart3,
  Settings,
  UserCog,
  Building2,
  ChevronUp,
  User,
  LogOut,
  Zap,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import Link from "next/link"
import Image from "next/image"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLogout } from "@/hooks"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: UserProfile
}

// Navigation items with permission requirements
const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    permission: "view_dashboard" as const,
    section: "main",
  },
  {
    title: "Conversations",
    url: "/dashboard/conversations",
    icon: MessageSquare,
    permission: "view_conversations" as const,
    section: "main",
  },
  {
    title: "Contacts",
    url: "/dashboard/contacts",
    icon: Users,
    permission: "view_contacts" as const,
    section: "main",
  },
  {
    title: "Campaigns",
    url: "/dashboard/campaigns",
    icon: Send,
    permission: "view_campaigns" as const,
    section: "management",
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
    permission: "view_analytics" as const,
    section: "management",
  },
  {
    title: "Teams",
    url: "/dashboard/teams",
    icon: Building2,
    permission: "view_teams" as const,
    section: "management",
  },
  {
    title: "User Management",
    url: "/dashboard/users",
    icon: UserCog,
    permission: "manage_users" as const,
    section: "admin",
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    permission: "manage_settings" as const,
    section: "admin",
  },

]

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const { setOpenMobile, isMobile } = useSidebar()
  const { execute: logout, loading: isPending } = useLogout()

  // Filter navigation items based on user permissions
  const allowedItems = navigationItems.filter((item) => hasPermission(user.role, item.permission))

  // Organize items into sections
  const mainItems = allowedItems.filter((item) => item.section === "main")
  const managementItems = allowedItems.filter((item) => item.section === "management")
  const adminItems = allowedItems.filter((item) => item.section === "admin")

  // Handle navigation link click to close mobile sidebar
  const handleNavigationClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleSignOut = async () => {
    // Close mobile sidebar if on mobile
    if (isMobile) {
      setOpenMobile(false)
    }

    try {
      await logout()
      // Navigation is handled by the hook
    } catch (error) {
      // Error is handled by the hook
    }
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r bg-sidebar" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 py-2 px-0.5">
          <Image
            src="/images/logo-avenue.png"
            alt="Avenue Developments Logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Omnichannel CRM</span>
            <span className="truncate text-xs text-muted-foreground">{user.role.replace("_", " ").toUpperCase()}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        {/* Main Navigation */}
        {mainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url} onClick={handleNavigationClick}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Management Section */}
        {managementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url} onClick={handleNavigationClick}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin Section */}
        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url} onClick={handleNavigationClick}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                      <AvatarFallback>{user.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.full_name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" onClick={handleNavigationClick}>
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                {hasPermission(user.role, "manage_settings") && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" onClick={handleNavigationClick}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} disabled={isPending}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {isPending ? "Signing Out..." : "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
