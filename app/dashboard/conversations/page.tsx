import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Search, Filter, Plus, Clock, User, Phone } from "lucide-react"
import Link from "next/link"

export default async function ConversationsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)
  if (!profile || !hasPermission(profile.role, "view_conversations")) {
    redirect("/dashboard")
  }

  // Mock conversation data - replace with real data from Supabase
  const conversations = [
    {
      id: "1",
      contact_name: "John Doe",
      phone_number: "+1234567890",
      last_message: "Thank you for your help!",
      last_message_at: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      status: "open" as const,
      priority: "normal" as const,
      assigned_agent: profile.role === "agent" ? profile.full_name : "Sarah Wilson",
      unread_count: 2,
    },
    {
      id: "2",
      contact_name: "Jane Smith",
      phone_number: "+1234567891",
      last_message: "I need help with my order",
      last_message_at: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      status: "pending" as const,
      priority: "high" as const,
      assigned_agent: profile.role === "agent" ? profile.full_name : "Mike Johnson",
      unread_count: 5,
    },
    {
      id: "3",
      contact_name: "Bob Wilson",
      phone_number: "+1234567892",
      last_message: "Perfect, thanks!",
      last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      status: "closed" as const,
      priority: "low" as const,
      assigned_agent: profile.role === "agent" ? profile.full_name : "Lisa Chen",
      unread_count: 0,
    },
  ]

  const statusColors = {
    open: "bg-green-500",
    pending: "bg-yellow-500",
    closed: "bg-gray-500",
  }

  const priorityColors = {
    low: "bg-blue-500",
    normal: "bg-gray-500",
    high: "bg-red-500",
    urgent: "bg-red-600",
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Conversations</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {profile.role === "agent"
              ? "Manage your assigned customer conversations"
              : "View and manage team conversations"}
          </p>
        </div>
        {hasPermission(profile.role, "manage_conversations") && (
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-8" />
              </div>
            </div>
            <Button variant="outline" className="w-full sm:w-auto bg-transparent">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <div className="space-y-4">
        {conversations.map((conversation) => (
          <Link key={conversation.id} href={`/dashboard/conversations/${conversation.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted flex-shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h3 className="font-semibold truncate">{conversation.contact_name}</h3>
                        {conversation.unread_count > 0 && (
                          <Badge variant="destructive" className="text-xs w-fit">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{conversation.phone_number}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
                        {conversation.last_message}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:text-right space-y-2 sm:items-end">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`${statusColors[conversation.status]} text-white text-xs`}>
                        {conversation.status}
                      </Badge>
                      <Badge className={`${priorityColors[conversation.priority]} text-white text-xs`}>
                        {conversation.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {conversation.last_message_at.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {profile.role !== "agent" && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        Assigned to: {conversation.assigned_agent}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.filter((c) => c.status === "open").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.filter((c) => c.status === "pending").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unread</CardTitle>
            <Badge className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.reduce((sum, c) => sum + c.unread_count, 0)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
