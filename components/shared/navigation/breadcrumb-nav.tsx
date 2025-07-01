"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Define the breadcrumb mapping for different routes
const breadcrumbMap: Record<string, string> = {
    dashboard: "Dashboard",
    conversations: "Conversations",
    contacts: "Contacts",
    campaigns: "Campaigns",
    analytics: "Analytics",
    teams: "Teams",
    users: "User Management",
    settings: "Settings",

    profile: "Profile",
}

// Function to format the path segment for display
function formatBreadcrumbItem(segment: string): string {
    // Handle special cases
    if (segment === "dashboard") return "Dashboard"

    // Convert kebab-case or snake_case to Title Case
    return segment
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
}

// Function to generate breadcrumb items
function generateBreadcrumbItems(pathname: string) {
    const segments = pathname.split("/").filter(Boolean)
    const items = []

    // Always start with Dashboard
    items.push({
        label: "Dashboard",
        href: "/dashboard",
        isCurrent: segments.length === 1 && segments[0] === "dashboard",
    })

    // Add other segments
    for (let i = 1; i < segments.length; i++) {
        const segment = segments[i]
        const href = `/${segments.slice(0, i + 1).join("/")}`
        const label = breadcrumbMap[segment] || formatBreadcrumbItem(segment)

        items.push({
            label,
            href,
            isCurrent: i === segments.length - 1,
        })
    }

    return items
}

export function BreadcrumbNav() {
    const pathname = usePathname()
    const breadcrumbItems = generateBreadcrumbItems(pathname)

    // Don't show breadcrumb on non-dashboard pages
    if (!pathname.startsWith("/dashboard")) {
        return null
    }

    return (
        <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList>
                {breadcrumbItems.map((item, index) => (
                    <React.Fragment key={item.href}>
                        {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                        <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                            {item.isCurrent ? (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
