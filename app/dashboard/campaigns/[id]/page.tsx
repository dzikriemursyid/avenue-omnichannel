import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { CampaignDetailsWithAnalytics } from "@/components/dashboard/campaigns/campaign-details-with-analytics"

export default async function CampaignDetailsPage({ params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    return <CampaignDetailsWithAnalytics campaignId={id} profile={profile} />
} 