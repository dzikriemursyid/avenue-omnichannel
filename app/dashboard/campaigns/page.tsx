import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Send, Plus, Calendar, Users, TrendingUp, Play, Pause, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default async function CampaignsPage() {
  const supabase = createClient()
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
  ]

  const statusColors = {
    draft: "bg-gray-500",
    scheduled: "bg-blue-500",
    running: "bg-green-500",
    completed: "bg-purple-500",
    paused: "bg-yellow-500",
    failed: "bg-red-500",
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {profile.role === "leader"
              ? "Create and manage team campaigns"
              : profile.role === "general_manager"
                ? "Oversee all campaign activities"
                : "Manage system-wide campaigns"}
          </p>
        </div>
        {hasPermission(profile.role, "manage_campaigns") && (
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        )}
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              {campaigns.filter((c) => c.status === "running").length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + c.sent_count, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">96.4%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.2%</div>
            <p className="text-xs text-muted-foreground">+5.3% from last week</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <CardTitle className="text-lg truncate">{campaign.name}</CardTitle>
                    <Badge className={`${statusColors[campaign.status]} text-white w-fit`}>{campaign.status}</Badge>
                  </div>
                  <CardDescription className="text-sm">{campaign.description}</CardDescription>
                </div>
                {hasPermission(profile.role, "manage_campaigns") && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Play className="h-4 w-4 mr-2" />
                        Start Campaign
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Campaign
                      </DropdownMenuItem>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round((campaign.sent_count / campaign.target_count) * 100)}%</span>
                  </div>
                  <Progress value={(campaign.sent_count / campaign.target_count) * 100} className="w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{campaign.sent_count.toLocaleString()} sent</span>
                    <span>{campaign.target_count.toLocaleString()} total</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-base sm:text-lg font-semibold text-green-600">
                        {campaign.delivered_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Delivered</div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-base sm:text-lg font-semibold text-blue-600">{campaign.read_count}</div>
                      <div className="text-xs text-muted-foreground">Read</div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-base sm:text-lg font-semibold text-purple-600">
                        {campaign.sent_count > 0 ? Math.round((campaign.read_count / campaign.sent_count) * 100) : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Rate</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-muted-foreground">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="truncate">Template: {campaign.template_name}</span>
                  {profile.role !== "agent" && <span className="truncate">Created by: {campaign.created_by}</span>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">
                    {campaign.status === "scheduled"
                      ? `Scheduled: ${campaign.scheduled_at.toLocaleDateString()}`
                      : `Created: ${campaign.created_at.toLocaleDateString()}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
