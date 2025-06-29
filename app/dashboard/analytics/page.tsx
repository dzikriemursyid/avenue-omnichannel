import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, MessageSquare, Clock, Target, Award, Activity } from "lucide-react"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)
  if (!profile || !hasPermission(profile.role, "view_analytics")) {
    redirect("/dashboard")
  }

  // Mock analytics data based on role
  const getAnalyticsData = (role: string) => {
    const baseData = {
      personal: {
        conversations_handled: 45,
        messages_sent: 234,
        avg_response_time: 2.3,
        customer_satisfaction: 4.7,
        resolution_rate: 89,
      },
    }

    if (role === "agent") return baseData

    return {
      ...baseData,
      team: {
        team_conversations: 156,
        team_messages: 892,
        team_avg_response: 3.1,
        team_satisfaction: 4.5,
        active_agents: 8,
      },
      ...(role === "general_manager" || role === "admin"
        ? {
            global: {
              total_conversations: 1247,
              total_messages: 5634,
              global_avg_response: 2.8,
              global_satisfaction: 4.6,
              total_teams: 5,
              total_agents: 23,
            },
          }
        : {}),
    }
  }

  const analytics = getAnalyticsData(profile.role)

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {profile.role === "agent"
            ? "Your personal performance metrics"
            : profile.role === "leader"
              ? "Team performance and individual metrics"
              : profile.role === "general_manager"
                ? "Cross-team analytics and global insights"
                : "System-wide analytics and performance metrics"}
        </p>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto">
          <TabsTrigger value="personal" className="w-full">
            Personal
          </TabsTrigger>
          {hasPermission(profile.role, "view_team_analytics") && (
            <TabsTrigger value="team" className="w-full">
              Team
            </TabsTrigger>
          )}
          {hasPermission(profile.role, "view_global_analytics") && (
            <TabsTrigger value="global" className="w-full">
              Global
            </TabsTrigger>
          )}
        </TabsList>

        {/* Personal Analytics */}
        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversations</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.personal.conversations_handled}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.personal.messages_sent}</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.personal.avg_response_time}m</div>
                <p className="text-xs text-muted-foreground">-15% improvement</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.personal.customer_satisfaction}/5</div>
                <p className="text-xs text-muted-foreground">+0.2 from last month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Overview</CardTitle>
                <CardDescription>Your key metrics this month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Resolution Rate</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{analytics.personal.resolution_rate}%</Badge>
                    <span className="text-xs text-green-600">+5%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">First Response Time</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">1.8m</Badge>
                    <span className="text-xs text-green-600">-20%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Customer Retention</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">94%</Badge>
                    <span className="text-xs text-green-600">+3%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Achievements</CardTitle>
                <CardDescription>Your accomplishments this month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Award className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Top Performer</p>
                    <p className="text-xs text-muted-foreground">Highest satisfaction rating this week</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Goal Achieved</p>
                    <p className="text-xs text-muted-foreground">Exceeded monthly conversation target</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Quick Responder</p>
                    <p className="text-xs text-muted-foreground">Fastest response time improvement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Analytics */}
        {hasPermission(profile.role, "view_team_analytics") && analytics.team && (
          <TabsContent value="team" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Conversations</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.team.team_conversations}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Messages</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.team.team_messages}</div>
                  <p className="text-xs text-muted-foreground">+8% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Avg Response</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.team.team_avg_response}m</div>
                  <p className="text-xs text-muted-foreground">-10% improvement</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.team.active_agents}</div>
                  <p className="text-xs text-muted-foreground">Team members</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Global Analytics */}
        {hasPermission(profile.role, "view_global_analytics") && analytics.global && (
          <TabsContent value="global" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.global.total_conversations.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Across all teams</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.global.total_messages.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">+15% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Global Avg Response</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.global.global_avg_response}m</div>
                  <p className="text-xs text-muted-foreground">Company-wide</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.global.total_agents}</div>
                  <p className="text-xs text-muted-foreground">Across {analytics.global.total_teams} teams</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
