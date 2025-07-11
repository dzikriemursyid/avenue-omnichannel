import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import CampaignDetails from "@/components/dashboard/campaigns/campaign-details"

interface CampaignDetailsPageProps {
    params: {
        id: string
    }
}

export default async function CampaignDetailsPage({ params }: CampaignDetailsPageProps) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const profile = await getUserProfile(user.id)
    if (!profile || !hasPermission(profile.role, "view_campaigns")) {
        redirect("/dashboard")
    }

    // Mock campaign data - in real app, fetch by ID
    const campaign = {
        id: params.id,
        name: "Welcome Series",
        description: "Onboarding sequence for new customers with personalized welcome messages and product introductions.",
        status: "running" as "draft" | "scheduled" | "running" | "completed" | "paused" | "failed",
        template_name: "Welcome Template",
        target_count: 1250,
        sent_count: 980,
        delivered_count: 945,
        read_count: 678,
        failed_count: 35,
        scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
        created_by: "Sarah Wilson",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        audience: "New Customers (Last 30 days)",
        batch_size: 1000,
        send_schedule: "immediate",
        message_content: "Hello {{1}}! Welcome to our service. We're excited to have you on board. Here's your personalized welcome message with exclusive offers just for you.",
    }

    // Mock delivery stats
    const deliveryStats = [
        { date: "2024-01-15", sent: 150, delivered: 145, read: 98, failed: 5 },
        { date: "2024-01-16", sent: 200, delivered: 195, read: 134, failed: 5 },
        { date: "2024-01-17", sent: 180, delivered: 175, read: 120, failed: 5 },
        { date: "2024-01-18", sent: 220, delivered: 215, read: 156, failed: 5 },
        { date: "2024-01-19", sent: 230, delivered: 215, read: 170, failed: 15 },
    ]

    return <CampaignDetails campaign={campaign} deliveryStats={deliveryStats} />
} 