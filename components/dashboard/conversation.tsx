"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Search, Filter, Plus, Clock, User, Phone, RefreshCw } from "lucide-react"
import Link from "next/link"
import { hasPermission } from "@/lib/supabase/rbac"
import { useConversations } from "@/hooks/use-conversations"
import { useRealtimeConversations } from "@/hooks/use-realtime-conversations"
import { useState, useCallback } from "react"

interface ConversationProps {
  profile: {
    role: "admin" | "general_manager" | "leader" | "agent"
    full_name: string
  }
}

export default function Conversation({ profile }: ConversationProps) {
  const { conversations, stats, isLoading, error, refresh } = useConversations()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  
  // Memoize callbacks to prevent infinite re-renders
  const handleConversationUpdate = useCallback((updatedConversation: any) => {
    console.log('🔄 Conversation updated via realtime:', updatedConversation)
    // Refresh conversations list to show latest data
    refresh()
  }, [refresh])

  const handleNewConversation = useCallback((newConversation: any) => {
    console.log('🆕 New conversation via realtime:', newConversation)
    // Refresh conversations list to include new conversation
    refresh()
  }, [refresh])

  // Setup realtime subscription for conversation updates
  useRealtimeConversations({
    onConversationUpdate: handleConversationUpdate,
    onNewConversation: handleNewConversation
  })

  // Filter conversations based on search and status
  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conversation.phone_number.includes(searchTerm) ||
                         conversation.last_message.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = selectedStatus === "all" || conversation.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {hasPermission(profile.role, "manage_conversations") && (
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          )}
        </div>
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
                <Input 
                  placeholder="Search conversations..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading conversations...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-6">
            <div className="text-center text-red-500">
              <p>Error loading conversations: {error}</p>
              <Button onClick={refresh} variant="outline" className="mt-2">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredConversations.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No conversations found</p>
              <p className="text-sm">
                {searchTerm || selectedStatus !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Start a conversation to see it here"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversations List */}
      {!isLoading && !error && filteredConversations.length > 0 && (
        <div className="flex flex-col gap-4">
          {filteredConversations.map((conversation) => (
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
                        {new Date(conversation.last_message_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {/* Window status indicator */}
                    <div className="text-xs text-muted-foreground">
                      {conversation.is_within_window ? (
                        <span className="text-green-600">📱 Active Window</span>
                      ) : (
                        <span className="text-red-600">⏰ Window Expired</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unread</CardTitle>
            <Badge className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_unread}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
