"use client"

import { usePathname } from "next/navigation"

interface CampaignHeaderProps {
    profile: {
        role: "admin" | "general_manager" | "leader" | "agent"
    }
}

export default function CampaignHeader({ profile }: CampaignHeaderProps) {
    const pathname = usePathname()

    const getHeaderContent = () => {
        if (pathname === "/dashboard/campaigns") {
            return {
                title: "Campaign Overview",
                description: profile.role === "leader"
                    ? "Create and manage team campaigns"
                    : profile.role === "general_manager"
                        ? "Oversee all campaign activities"
                        : "Manage system-wide campaigns"
            }
        } else if (pathname === "/dashboard/campaigns/create") {
            return {
                title: "Create New Campaign",
                description: "Set up a new campaign with your target audience and messaging strategy."
            }
        } else if (pathname === "/dashboard/campaigns/send") {
            return {
                title: "Send Campaigns",
                description: "Manage and send your campaigns to target audiences."
            }
        } else if (pathname.startsWith("/dashboard/campaigns/") && pathname !== "/dashboard/campaigns/create" && pathname !== "/dashboard/campaigns/send") {
            return {
                title: "Campaign Details",
                description: "View and manage campaign details and performance."
            }
        } else {
            return {
                title: "Campaigns",
                description: profile.role === "leader"
                    ? "Create and manage team campaigns"
                    : profile.role === "general_manager"
                        ? "Oversee all campaign activities"
                        : "Manage system-wide campaigns"
            }
        }
    }

    const { title, description } = getHeaderContent()

    return (
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
        </div>
    )
} 