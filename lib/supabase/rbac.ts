import type { UserProfile } from "./profiles"

export type Permission =
  | "view_dashboard"
  | "view_conversations"
  | "manage_conversations"
  | "view_contacts"
  | "manage_contacts"
  | "view_campaigns"
  | "manage_campaigns"
  | "view_analytics"
  | "view_team_analytics"
  | "view_global_analytics"
  | "manage_team"
  | "view_teams"
  | "manage_users"
  | "manage_settings"
  | "manage_integrations"

const rolePermissions: Record<UserProfile["role"], Permission[]> = {
  agent: [
    "view_dashboard",
    "view_conversations",
    "manage_conversations",
    "view_contacts",
    "view_campaigns", // Only assigned campaigns
    "view_analytics", // Personal metrics only
  ],
  leader: [
    // All agent permissions
    "view_dashboard",
    "view_conversations",
    "manage_conversations",
    "view_contacts",
    "manage_contacts",
    "view_campaigns",
    "manage_campaigns",
    "view_analytics",
    "view_team_analytics",
    "manage_team",
  ],
  general_manager: [
    // All leader permissions
    "view_dashboard",
    "view_conversations",
    "manage_conversations",
    "view_contacts",
    "manage_contacts",
    "view_campaigns",
    "manage_campaigns",
    "view_analytics",
    "view_team_analytics",
    "view_global_analytics",
    "manage_team",
    "view_teams",
  ],
  admin: [
    // All GM permissions + admin-specific
    "view_dashboard",
    "view_conversations",
    "manage_conversations",
    "view_contacts",
    "manage_contacts",
    "view_campaigns",
    "manage_campaigns",
    "view_analytics",
    "view_team_analytics",
    "view_global_analytics",
    "manage_team",
    "view_teams",
    "manage_users",
    "manage_settings",
    "manage_integrations",
  ],
}

export function hasPermission(userRole: UserProfile["role"], permission: Permission): boolean {
  return rolePermissions[userRole].includes(permission)
}

export function getUserPermissions(userRole: UserProfile["role"]): Permission[] {
  return rolePermissions[userRole]
}

export function canAccessRoute(userRole: UserProfile["role"], route: string): boolean {
  const routePermissions: Record<string, Permission> = {
    "/dashboard": "view_dashboard",
    "/dashboard/conversations": "view_conversations",
    "/dashboard/contacts": "view_contacts",
    "/dashboard/campaigns": "view_campaigns",
    "/dashboard/analytics": "view_analytics",
    "/dashboard/teams": "view_teams",
    "/dashboard/users": "manage_users",
    "/dashboard/settings": "manage_settings",
  }

  const requiredPermission = routePermissions[route]
  if (!requiredPermission) return true // Allow access to routes without specific permissions

  return hasPermission(userRole, requiredPermission)
}
