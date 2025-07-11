import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { CampaignOverview } from "@/components/dashboard/campaigns"

export default async function CampaignsPage() {
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

  // Mock campaign data
  const campaigns = [
    {
      id: "1",
      name: "Welcome Series",
      description: "Onboarding sequence for new customers",
      status: "running" as const,
      template_name: "Welcome Template",
      target_count: 1250,
      sent_count: 980,
      delivered_count: 945,
      read_count: 678,
      scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
      created_by: "Sarah Wilson",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    },
    {
      id: "2",
      name: "Product Launch",
      description: "Announcing our new product features",
      status: "scheduled" as const,
      template_name: "Product Announcement",
      target_count: 5000,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 48), // In 2 days
      created_by: "Mike Johnson",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    },
    {
      id: "3",
      name: "Customer Feedback",
      description: "Collecting feedback from recent purchases",
      status: "completed" as const,
      template_name: "Feedback Request",
      target_count: 800,
      sent_count: 800,
      delivered_count: 785,
      read_count: 542,
      scheduled_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
      created_by: "Lisa Chen",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
    },
    {
      id: "4",
      name: "Holiday Promotion",
      description: "Special holiday offers and discounts",
      status: "draft" as const,
      template_name: "Holiday Promo",
      target_count: 3000,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // In 2 weeks
      created_by: "Alex Rodriguez",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
    },
    {
      id: "5",
      name: "Weekly Newsletter",
      description: "Weekly updates and industry insights",
      status: "paused" as const,
      template_name: "Newsletter Template",
      target_count: 2000,
      sent_count: 1200,
      delivered_count: 1150,
      read_count: 890,
      scheduled_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      created_by: "Emma Thompson",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    },
  ]

  return <CampaignOverview profile={profile} campaigns={campaigns} />
}
