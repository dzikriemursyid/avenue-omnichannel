import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Plus, List } from "lucide-react"
import Link from "next/link"
import CampaignHeader from "@/components/dashboard/campaigns/campaign-header"

interface CampaignsLayoutProps {
    children: React.ReactNode
}

export default async function CampaignsLayout({ children }: CampaignsLayoutProps) {
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

    return (
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
            <CampaignHeader profile={profile} />

            <Tabs defaultValue="overview" className="w-full space-y-4">
                <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
                    <TabsTrigger value="overview" asChild>
                        <Link href="/dashboard/campaigns" className="flex items-center gap-2">
                            <List className="h-4 w-4" />
                            <span className="hidden sm:inline">Overview</span>
                        </Link>
                    </TabsTrigger>
                    {hasPermission(profile.role, "manage_campaigns") && (
                        <>
                            <TabsTrigger value="create" asChild>
                                <Link href="/dashboard/campaigns/create" className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Create</span>
                                </Link>
                            </TabsTrigger>
                            <TabsTrigger value="send" asChild>
                                <Link href="/dashboard/campaigns/send" className="flex items-center gap-2">
                                    <Send className="h-4 w-4" />
                                    <span className="hidden sm:inline">Send</span>
                                </Link>
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>
                <div className="space-y-4">
                    {children}
                </div>
            </Tabs>
        </div>
    )
} 