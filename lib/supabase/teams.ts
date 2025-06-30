import { createClient } from "@/lib/supabase/server";

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface TeamLeader {
  id: string;
  full_name: string;
  email: string;
}

export interface TeamMetrics {
  conversations_this_month: number;
  avg_response_time: number;
  satisfaction_rating: number;
  resolution_rate: number;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  leader: TeamLeader | null;
  members: TeamMember[];
  metrics: TeamMetrics;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getTeams(): Promise<Team[]> {
  const supabase = await createClient();

  try {
    // Fetch teams with leader information
    const { data: teamsData, error: teamsError } = (await supabase
      .from("teams")
      .select(
        `
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at,
        leader:leader_id (
          id,
          full_name,
          email
        )
      `
      )
      .order("created_at", { ascending: true })) as {
      data: Array<{
        id: string;
        name: string;
        description: string | null;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        leader: {
          id: string;
          full_name: string;
          email: string;
        } | null;
      }> | null;
      error: any;
    };

    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      return [];
    }

    if (!teamsData) return [];

    // Fetch all team members
    const { data: membersData, error: membersError } = await supabase.from("profiles").select("id, full_name, email, role, is_active, team_id").not("team_id", "is", null);

    if (membersError) {
      console.error("Error fetching team members:", membersError);
    }

    // Fetch conversation metrics for each team (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: conversationsData, error: conversationsError } = await supabase.from("conversations").select("team_id, status, created_at").gte("created_at", thirtyDaysAgo.toISOString());

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError);
    }

    // Fetch daily metrics for response time calculation
    const { data: metricsData, error: metricsError } = await supabase.from("daily_metrics").select("team_id, response_time_avg_minutes").gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

    if (metricsError) {
      console.error("Error fetching daily metrics:", metricsError);
    }

    // Process and combine data
    const teams: Team[] = teamsData.map((team) => {
      // Get team members
      const teamMembers = (membersData || [])
        .filter((member) => member.team_id === team.id)
        .map((member) => ({
          id: member.id,
          full_name: member.full_name,
          email: member.email,
          role: member.role,
          is_active: member.is_active,
        }));

      // Calculate team metrics
      const teamConversations = (conversationsData || []).filter((conv) => conv.team_id === team.id);

      const teamMetrics = (metricsData || []).filter((metric) => metric.team_id === team.id);

      const avgResponseTime = teamMetrics.length > 0 ? teamMetrics.reduce((sum, metric) => sum + (metric.response_time_avg_minutes || 0), 0) / teamMetrics.length : 2.5; // Default fallback

      const conversationsThisMonth = teamConversations.length;
      const closedConversations = teamConversations.filter((conv) => conv.status === "closed").length;
      const resolutionRate = conversationsThisMonth > 0 ? Math.round((closedConversations / conversationsThisMonth) * 100) : 90; // Default fallback

      // Mock satisfaction rating (would come from customer feedback in real implementation)
      const satisfactionRating = 4.2 + Math.random() * 0.6; // Random between 4.2-4.8

      const metrics: TeamMetrics = {
        conversations_this_month: conversationsThisMonth,
        avg_response_time: Math.round(avgResponseTime * 10) / 10, // Round to 1 decimal
        satisfaction_rating: Math.round(satisfactionRating * 10) / 10,
        resolution_rate: resolutionRate,
      };

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        leader: team.leader
          ? {
              id: team.leader.id,
              full_name: team.leader.full_name,
              email: team.leader.email,
            }
          : null,
        members: teamMembers,
        metrics,
        is_active: team.is_active,
        created_at: team.created_at,
        updated_at: team.updated_at,
      };
    });

    return teams;
  } catch (error) {
    console.error("Error in getTeams:", error);
    return [];
  }
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  const teams = await getTeams();
  return teams.find((team) => team.id === teamId) || null;
}

export async function getTeamsForUser(userId: string, userRole: string): Promise<Team[]> {
  const supabase = await createClient();

  // Admin and GM can see all teams
  if (["admin", "general_manager"].includes(userRole)) {
    return getTeams();
  }

  // For leaders and agents, only show their team
  const { data: profile } = await supabase.from("profiles").select("team_id").eq("id", userId).single();

  if (!profile?.team_id) {
    return [];
  }

  const teams = await getTeams();
  return teams.filter((team) => team.id === profile.team_id);
}
