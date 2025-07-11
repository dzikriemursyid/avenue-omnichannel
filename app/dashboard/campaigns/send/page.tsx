import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { CampaignSend } from "@/components/dashboard/campaigns"

export default async function SendCampaignPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const profile = await getUserProfile(user.id)
    if (!profile || !hasPermission(profile.role, "manage_campaigns")) {
        redirect("/dashboard")
    }

    // Mock campaigns ready to send
    const campaigns = [
        {
            id: "1",
            name: "Product Launch",
            description: "Announcing our new product features",
            status: "scheduled" as "draft" | "scheduled" | "running" | "completed" | "paused" | "failed",
            template_name: "Product Announcement",
            target_count: 5000,
            sent_count: 0,
            scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 48), // In 2 days
            audience: "All Customers",
            progress: 0,
        },
        {
            id: "2",
            name: "Holiday Promotion",
            description: "Special holiday offers and discounts",
            status: "draft" as "draft" | "scheduled" | "running" | "completed" | "paused" | "failed",
            template_name: "Holiday Promo",
            target_count: 3000,
            sent_count: 0,
            scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // In 2 weeks
            audience: "Premium Customers",
            progress: 0,
        },
        {
            id: "3",
            name: "Weekly Newsletter",
            description: "Weekly updates and industry insights",
            status: "paused" as "draft" | "scheduled" | "running" | "completed" | "paused" | "failed",
            template_name: "Newsletter Template",
            target_count: 2000,
            sent_count: 1200,
            scheduled_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
            audience: "All Customers",
            progress: 60,
        },
        {
            id: "4",
            name: "Customer Feedback",
            description: "Collecting feedback from recent purchases",
            status: "completed" as "draft" | "scheduled" | "running" | "completed" | "paused" | "failed",
            template_name: "Feedback Request",
            target_count: 800,
            sent_count: 800,
            scheduled_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
            audience: "New Customers",
            progress: 100,
        },
    ]

    return <CampaignSend campaigns={campaigns} />
} 