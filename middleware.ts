// middleware.ts - Enhanced version dengan role-based routing
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Handle Supabase auth first
  const response = await updateSession(request);

  // Skip role-based routing for auth pages and API routes
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isPublicRoute = request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/public");

  if (isAuthPage || isApiRoute || isPublicRoute) {
    return response;
  }

  // Role-based dashboard routing
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // User not authenticated, redirect to login
        const redirectUrl = new URL("/auth/login", request.url);
        redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }

      // Get user profile for role checking
      const { data: profile } = await supabase.from("profiles").select("role, is_active, team_id").eq("id", user.id).single();

      if (!profile) {
        // Profile not found, redirect to setup
        return NextResponse.redirect(new URL("/auth/setup-profile", request.url));
      }

      if (!profile.is_active) {
        // User deactivated, redirect to suspended page
        return NextResponse.redirect(new URL("/auth/suspended", request.url));
      }

      // Define route permissions
      const routePermissions = {
        "/dashboard": ["admin", "general_manager", "leader", "agent"],
        "/dashboard/users": ["admin"],
        "/dashboard/settings": ["admin"],
        "/dashboard/integrations": ["admin"],
        "/dashboard/teams": ["admin", "general_manager", "leader"],
        "/dashboard/analytics": ["admin", "general_manager", "leader", "agent"],
        "/dashboard/campaigns": ["admin", "general_manager", "leader"],
        "/dashboard/contacts": ["admin", "general_manager", "leader", "agent"],
        "/dashboard/conversations": ["admin", "general_manager", "leader", "agent"],
      };

      // Check if user has permission for the current route
      const currentPath = request.nextUrl.pathname;
      const allowedRoles = routePermissions[currentPath as keyof typeof routePermissions];

      if (allowedRoles && !allowedRoles.includes(profile.role)) {
        // User doesn't have permission, redirect to appropriate page
        const fallbackRoutes = {
          admin: "/dashboard",
          general_manager: "/dashboard",
          leader: "/dashboard",
          agent: "/dashboard/conversations",
        };

        const fallbackUrl = fallbackRoutes[profile.role as keyof typeof fallbackRoutes] || "/dashboard";
        return NextResponse.redirect(new URL(fallbackUrl, request.url));
      }

      // First-time login redirection based on role
      if (currentPath === "/dashboard") {
        const defaultRoutes = {
          admin: "/dashboard/users",
          general_manager: "/dashboard/analytics",
          leader: "/dashboard/teams",
          agent: "/dashboard/conversations",
        };

        const defaultRoute = defaultRoutes[profile.role as keyof typeof defaultRoutes];
        if (defaultRoute && defaultRoute !== currentPath) {
          return NextResponse.redirect(new URL(defaultRoute, request.url));
        }
      }
    } catch (error) {
      console.error("Middleware error:", error);
      // On error, redirect to login
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
