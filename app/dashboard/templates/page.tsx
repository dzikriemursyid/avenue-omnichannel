import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import TemplateList from "@/components/dashboard/templates/template-list"

export default async function TemplatesPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const profile = await getUserProfile(user.id)
    if (!profile) {
        redirect("/dashboard")
    }

    // Check if user can view templates
    const canView = hasPermission(profile.role, "view_campaigns")
    if (!canView) {
        redirect("/dashboard")
    }

    // Check if user can manage templates
    const canManage = hasPermission(profile.role, "manage_campaigns")

    return (
        <div className="space-y-6">
            <TemplateList canManage={canManage} />
        </div>
    )
} 