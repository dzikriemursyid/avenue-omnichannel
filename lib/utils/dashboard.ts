export function getDefaultRouteForRole(role: string): string {
  const defaultRoutes = {
    admin: "/dashboard/users",
    general_manager: "/dashboard/analytics",
    leader: "/dashboard/teams",
    agent: "/dashboard/conversations",
  };

  return defaultRoutes[role as keyof typeof defaultRoutes] || "/dashboard";
}

export function getPermittedRoutes(role: string): string[] {
  const routePermissions = {
    admin: ["/dashboard", "/dashboard/users", "/dashboard/settings", "/dashboard/integrations", "/dashboard/teams", "/dashboard/analytics", "/dashboard/campaigns", "/dashboard/contacts", "/dashboard/conversations"],
    general_manager: ["/dashboard", "/dashboard/teams", "/dashboard/analytics", "/dashboard/campaigns", "/dashboard/contacts", "/dashboard/conversations"],
    leader: ["/dashboard", "/dashboard/teams", "/dashboard/analytics", "/dashboard/campaigns", "/dashboard/contacts", "/dashboard/conversations"],
    agent: ["/dashboard", "/dashboard/analytics", "/dashboard/contacts", "/dashboard/conversations"],
  };

  return routePermissions[role as keyof typeof routePermissions] || ["/dashboard"];
}
