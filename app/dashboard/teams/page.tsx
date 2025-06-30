import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { getTeamsForUser } from "@/lib/supabase/teams"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Building2, Users, Crown, Star, TrendingUp } from "lucide-react"
import { CreateTeamDialog } from "@/components/teams/create-team-dialog"
import { ManageTeamDialog } from "@/components/teams/manage-team-dialog"

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

  // Fetch teams based on user role
  const teams = await getTeamsForUser(user.id, profile.role)
  const canCreateTeam = ["admin", "general_manager"].includes(profile.role)
  const canDeleteTeam = ["admin", "general_manager"].includes(profile.role)

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
                : profile.role === "admin"
                  ? "Manage all teams and organizational structure"
                  : "View your team information"}
          </p>
        </div>
        {canCreateTeam && <CreateTeamDialog />}
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
            <p className="text-xs text-muted-foreground">Across {teams.length === 1 ? "your team" : "all teams"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teams.length > 0 ? (teams.reduce((sum, team) => sum + team.metrics.satisfaction_rating, 0) / teams.length).toFixed(1) : "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">Satisfaction rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Teams List */}
      <div className="space-y-6">
        {teams.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No teams available.</p>
            </CardContent>
          </Card>
        ) : (
          teams.map((team) => (
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
                  {(hasPermission(profile.role, "manage_team") ||
                    (profile.role === "leader" && team.leader?.id === user.id)) && (
                      <ManageTeamDialog team={team} canDelete={canDeleteTeam} />
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
                  {team.leader ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback>
                          {team.leader.full_name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{team.leader.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{team.leader.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No leader assigned</p>
                  )}
                </div>

                {/* Team Members */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Team Members ({team.members.length})</h4>
                  {team.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members assigned yet</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {team.members.map((member, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {member.full_name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{member.full_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {member.role}
                              </Badge>
                              <div
                                className={`h-2 w-2 rounded-full flex-shrink-0 ${member.is_active ? "bg-green-500" : "bg-gray-400"}`}
                              />
                              <span className="text-xs text-muted-foreground">{member.is_active ? "Online" : "Offline"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
          ))
        )}
      </div>
    </div>
  )
}
