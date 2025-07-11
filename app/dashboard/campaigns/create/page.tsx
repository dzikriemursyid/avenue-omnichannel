import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { CampaignCreate } from "@/components/dashboard/campaigns"
import { TemplateService } from "@/lib/twilio/templates"

export default async function CreateCampaignPage() {
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

    // Get real templates from database
    const templateService = new TemplateService()
    const localTemplates = await templateService.getLocalTemplates()

    // Format templates for the component
    const templates = localTemplates
        .filter(t => t.status === 'approved') // Only show approved templates
        .map(t => ({
            id: t.id,
            name: t.name,
            description: t.body_text.substring(0, 100) + (t.body_text.length > 100 ? '...' : ''),
        }))

    // Mock audience data
    const audiences = [
        { id: "1", name: "All Customers", count: 12500 },
        { id: "2", name: "New Customers (Last 30 days)", count: 850 },
        { id: "3", name: "Premium Customers", count: 2300 },
        { id: "4", name: "Inactive Customers", count: 4200 },
        { id: "5", name: "Test Group", count: 50 },
    ]

    return <CampaignCreate templates={templates} audiences={audiences} />
} 