import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Building2, Users, Plus, Crown, Star, TrendingUp } from "lucide-react"

export default async function TeamsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)
  if (!profile || !hasPermission(profile.role, "view_teams")) {
    redirect("/dashboard")
  }

  // Mock teams data
  const teams = [
    {
      id: "1",
      name: "Customer Support",
      description: "Primary customer support team",
      leader: {
        name: "Sarah Wilson",
        email: "sarah@company.com",
      },
      members: [
        { name: "John Doe", role: "agent", active: true },
        { name: "Jane Smith", role: "agent", active: true },
        { name: "Mike Johnson", role: "agent", active: false },
        { name: "Lisa Chen", role: "agent", active: true },
      ],
      metrics: {
        conversations_this_month: 234,
        avg_response_time: 2.1,
        satisfaction_rating: 4.8,
        resolution_rate: 92,
      },
      is_active: true,
    },
    {
      id: "2",
      name: "Sales Support",
      description: "Pre-sales and sales assistance team",
      leader: {
        name: "David Brown",
        email: "david@company.com",
      },
      members: [
        { name: "Emma Wilson", role: "agent", active: true },
        { name: "Tom Anderson", role: "agent", active: true },
        { name: "Amy Davis", role: "leader", active: true },
      ],
      metrics: {
        conversations_this_month: 156,
        avg_response_time: 1.8,
        satisfaction_rating: 4.6,
        resolution_rate: 89,
      },
      is_active: true,
    },
    {
      id: "3",
      name: "Technical Support",
      description: "Advanced technical assistance",
      leader: {
        name: "Alex Thompson",
        email: "alex@company.com",
      },
      members: [
        { name: "Chris Lee", role: "agent", active: true },
        { name: "Maria Garcia", role: "agent", active: true },
      ],
      metrics: {
        conversations_this_month: 89,
        avg_response_time: 3.2,
        satisfaction_rating: 4.9,
        resolution_rate: 95,
      },
      is_active: true,
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {profile.role === "leader"
              ? "Manage your team and view team performance"
              : profile.role === "general_manager"
                ? "Oversee all teams and their performance"
                : "Manage all teams and organizational structure"}
          </p>
        </div>
        {hasPermission(profile.role, "manage_team") && (
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        )}
      </div>

      {/* Teams Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
            <p className="text-xs text-muted-foreground">{teams.filter((t) => t.is_active).length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.reduce((sum, team) => sum + team.members.length, 0)}</div>
            <p className="text-xs text-muted-foreground">Across all teams</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(teams.reduce((sum, team) => sum + team.metrics.satisfaction_rating, 0) / teams.length).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Satisfaction rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Teams List */}
      <div className="space-y-6">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <CardTitle className="text-xl truncate">{team.name}</CardTitle>
                    <Badge variant={team.is_active ? "default" : "secondary"} className="w-fit">
                      {team.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">{team.description}</CardDescription>
                </div>
                {hasPermission(profile.role, "manage_team") && (
                  <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                    Manage Team
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Team Leader */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  Team Leader
                </h4>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback>
                      {team.leader.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{team.leader.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{team.leader.email}</p>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Team Members ({team.members.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {team.members.map((member, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                          <div
                            className={`h-2 w-2 rounded-full flex-shrink-0 ${member.active ? "bg-green-500" : "bg-gray-400"}`}
                          />
                          <span className="text-xs text-muted-foreground">{member.active ? "Online" : "Offline"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Metrics */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-lg font-semibold">{team.metrics.conversations_this_month}</div>
                    <div className="text-xs text-muted-foreground">Conversations</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-lg font-semibold">{team.metrics.avg_response_time}m</div>
                    <div className="text-xs text-muted-foreground">Avg Response</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-lg font-semibold">{team.metrics.satisfaction_rating}/5</div>
                    <div className="text-xs text-muted-foreground">Satisfaction</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-lg font-semibold">{team.metrics.resolution_rate}%</div>
                    <div className="text-xs text-muted-foreground">Resolution</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
