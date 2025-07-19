"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Calendar,
    Send,
    AlertCircle,
    ArrowLeft,
    RefreshCw,
    Eye,
    CheckCircle,
    Clock,
    XCircle,
    MessageSquare,
    Activity,
    BarChart3,
    MessageCircle,
    Users,
    TrendingUp,
    EyeOff,
} from "lucide-react"
import { useCampaign } from "@/hooks"
import { toast } from "sonner"
import Link from "next/link"

interface CampaignDetailsWithAnalyticsProps {
    campaignId: string
    profile: {
        role: string
        id: string
        full_name: string
    }
}

interface CampaignMessage {
    id: string
    phone_number: string
    contact_name?: string
    status: string
    sent_at: string
    delivered_at?: string
    read_at?: string
    error_message?: string
}

interface ActivationStats {
    totalConversations: number
    activatedConversations: number
    dormantConversations: number
    activationRate: number
    avgResponseTimeHours: number
}

interface ActivatedDetail {
    conversationId: string
    contactName: string
    phoneNumber: string
    responseDelayHours: number
    activatedAt: string
}

export function CampaignDetailsWithAnalytics({ campaignId }: CampaignDetailsWithAnalyticsProps) {
    const { campaign, loading: campaignLoading, error: campaignError, refetch } = useCampaign(campaignId)
    const [messages, setMessages] = useState<CampaignMessage[]>([])
    const [messagesLoading, setMessagesLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    
    // Activation stats state
    const [activationStats, setActivationStats] = useState<ActivationStats | null>(null)
    const [activatedDetails, setActivatedDetails] = useState<ActivatedDetail[]>([])
    const [activationLoading, setActivationLoading] = useState(true)

    // Fetch campaign messages
    const fetchMessages = useCallback(async () => {
        try {
            const response = await fetch(`/api/dashboard/campaigns/${campaignId}/messages`)
            if (response.ok) {
                const data = await response.json()
                setMessages(data.data?.messages || [])
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error)
        } finally {
            setMessagesLoading(false)
        }
    }, [campaignId])

    // Fetch activation stats
    const fetchActivationStats = useCallback(async () => {
        try {
            setActivationLoading(true)
            const response = await fetch(`/api/campaigns/${campaignId}/activation-stats`)
            
            if (response.ok) {
                const result = await response.json()
                setActivationStats(result.stats)
                setActivatedDetails(result.activatedDetails || [])
            }
        } catch (error) {
            console.error('Failed to fetch activation stats:', error)
        } finally {
            setActivationLoading(false)
        }
    }, [campaignId])

    // Load messages and activation stats on mount
    useEffect(() => {
        fetchMessages()
        fetchActivationStats()
    }, [fetchMessages, fetchActivationStats])

    // Callback-based refresh - only refresh when analytics_updated_at changes
    useEffect(() => {
        if (!autoRefresh || !campaign) return

        let lastAnalyticsUpdate = campaign.analytics_updated_at

        // Only refresh if there are pending/sent messages or very recent analytics updates
        const hasPendingMessages = messages.some(msg => ['pending', 'sent'].includes(msg.status))
        const hasRecentUpdate = campaign.analytics_updated_at &&
            (Date.now() - new Date(campaign.analytics_updated_at).getTime()) < 5 * 60 * 1000 // 5 minutes

        if (hasPendingMessages || hasRecentUpdate) {
            const interval = setInterval(async () => {
                try {
                    // Fetch latest data
                    const response = await refetch()
                    await fetchMessages()
                    await fetchActivationStats()

                    // Check if analytics_updated_at has changed
                    if (response.success && response.data && response.data.analytics_updated_at !== lastAnalyticsUpdate) {
                        lastAnalyticsUpdate = response.data.analytics_updated_at
                        setLastUpdated(new Date())

                        // Show notification for significant changes
                        const deliveredCount = response.data.delivered_count || 0
                        const readCount = response.data.read_count || 0
                        if (deliveredCount > 0 || readCount > 0) {
                            toast.success(`Campaign update: ${deliveredCount} delivered, ${readCount} read`)
                        }
                    }
                } catch (error) {
                    console.error('Refresh error:', error)
                }
            }, 30000) // Check every 30 seconds for callback-triggered updates

            return () => clearInterval(interval)
        }
    }, [autoRefresh, campaign, messages, campaign?.analytics_updated_at, refetch, fetchMessages])


    // Manual refresh with loading state
    const handleManualRefresh = useCallback(async () => {
        setIsRefreshing(true)
        try {
            await Promise.all([refetch(), fetchMessages(), fetchActivationStats()])
            setLastUpdated(new Date())
            toast.success("Campaign data refreshed")
        } catch {
            toast.error("Failed to refresh campaign data")
        } finally {
            setIsRefreshing(false)
        }
    }, [refetch, fetchMessages, fetchActivationStats])

    const statusColors: Record<string, string> = {
        draft: "bg-gray-500",
        scheduled: "bg-blue-500",
        running: "bg-green-500",
        completed: "bg-purple-500",
        paused: "bg-yellow-500",
        failed: "bg-red-500",
    }

    const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
        draft: Clock,
        scheduled: Calendar,
        running: Send,
        completed: CheckCircle,
        paused: AlertCircle,
        failed: XCircle,
    }

    const messageStatusColors: Record<string, string> = {
        pending: "bg-gray-100 text-gray-800",
        sent: "bg-blue-100 text-blue-800",
        delivered: "bg-green-100 text-green-800",
        read: "bg-purple-100 text-purple-800",
        failed: "bg-red-100 text-red-800",
    }

    // Loading state
    if (campaignLoading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10" />
                        <div className="space-y-1">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>

                {/* Stats Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-1" />
                                <Skeleton className="h-3 w-20" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Progress Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-8" />
                            </div>
                            <Skeleton className="h-2 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Error state
    if (campaignError || !campaign) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load campaign: {campaignError?.message || "Campaign not found"}
                </AlertDescription>
            </Alert>
        )
    }

    const StatusIcon = statusIcons[campaign.status]
    const progress = Math.round(((campaign.sent_count || 0) / Math.max(campaign.target_count || 1, 1)) * 100)
    // Calculate effective delivered count - if a message is read, it was logically delivered
    const actualDeliveredCount = campaign.delivered_count || 0
    const readCount = campaign.read_count || 0
    // Total effectively delivered includes both delivered and read (since read implies delivered)
    const totalDeliveredCount = actualDeliveredCount + readCount

    // Group messages by status for analytics
    const messageStats = messages.reduce((acc, msg) => {
        acc[msg.status] = (acc[msg.status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    // Helper function to format response time
    const formatResponseTime = (hours: number) => {
        if (hours < 1) return "< 1 hour"
        if (hours === 1) return "1 hour"
        if (hours < 24) return `${hours} hours`
        if (hours === 24) return "1 day"
        const days = Math.floor(hours / 24)
        const remainingHours = hours % 24
        if (remainingHours === 0) return `${days} day${days > 1 ? 's' : ''}`
        return `${days}d ${remainingHours}h`
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/campaigns">
                            <ArrowLeft className="" />
                        </Link>
                    </Button>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{campaign.name}</h1>
                            <Badge variant="secondary" className={`${statusColors[campaign.status]} text-white flex items-center gap-1`}>
                                <StatusIcon className="h-3 w-3" />
                                {campaign.status}
                            </Badge>
                            {campaign.status === 'running' && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-sm">Live</span>
                                </div>
                            )}
                        </div>
                        {lastUpdated && (
                            <p className="text-xs text-muted-foreground">
                                Last updated: {lastUpdated.toLocaleTimeString()}
                                {campaign.status === 'running' && (
                                    <span className="ml-2 text-green-600">• Auto-refreshing every 5s</span>
                                )}
                            </p>
                        )}
                        <p className="text-muted-foreground">{campaign.description}</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    {campaign.status === 'running' && (
                        <div className="flex items-center gap-1 text-green-600 text-sm justify-end">
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                            <span>Real-time updates active</span>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-2 ${autoRefresh ? 'border-green-200' : ''}`}
                        >
                            <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {autoRefresh ? (
                                <span>Smart refresh {(() => {
                                    const hasPendingMessages = messages.some(msg => ['pending', 'sent'].includes(msg.status))
                                    const isRecentlyActive = campaign?.status === 'running' &&
                                        messages.some(msg => {
                                            const messageTime = new Date(msg.sent_at)
                                            const timeDiff = Date.now() - messageTime.getTime()
                                            return timeDiff < 10 * 60 * 1000
                                        })

                                    if (hasPendingMessages) return '(pending updates)'
                                    if (isRecentlyActive) return '(monitoring)'
                                    return '(idle)'
                                })()}</span>
                            ) : (
                                <span>Auto-refresh OFF</span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* Campaign Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(campaign.sent_count || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            of {(campaign.target_count || 0).toLocaleString()} total
                        </p>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDeliveredCount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            of {(campaign.sent_count || 0).toLocaleString()} sent
                        </p>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Read</CardTitle>
                        <Eye className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{readCount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            of {(campaign.sent_count || 0).toLocaleString()} sent
                        </p>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(campaign.failed_count || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            of {(campaign.sent_count || 0).toLocaleString()} sent
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Campaign Progress */}
            <Card className={isRefreshing ? "opacity-50" : ""}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Campaign Progress
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Overall Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="w-full" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{(campaign.sent_count || 0).toLocaleString()} sent</span>
                            <span>{(campaign.target_count || 0).toLocaleString()} total</span>
                        </div>
                    </div>

                    {/* Delivery Progress */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Delivered</span>
                                <span>{totalDeliveredCount.toLocaleString()}</span>
                            </div>
                            <Progress value={(campaign.sent_count || 0) > 0 ? (totalDeliveredCount / (campaign.sent_count || 1)) * 100 : 0} className="w-full" />
                            <div className="text-xs text-muted-foreground">
                                {totalDeliveredCount.toLocaleString()} of {(campaign.sent_count || 0).toLocaleString()} sent
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Read</span>
                                <span>{readCount.toLocaleString()}</span>
                            </div>
                            <Progress value={(campaign.sent_count || 0) > 0 ? (readCount / (campaign.sent_count || 1)) * 100 : 0} className="w-full" />
                            <div className="text-xs text-muted-foreground">
                                {readCount.toLocaleString()} of {(campaign.sent_count || 0).toLocaleString()} sent
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Successful</span>
                                <span>{((campaign.sent_count || 0) - (campaign.failed_count || 0)).toLocaleString()}</span>
                            </div>
                            <Progress value={(campaign.sent_count || 0) > 0 ? ((campaign.sent_count || 0) - (campaign.failed_count || 0)) / (campaign.sent_count || 1) * 100 : 0} className="w-full" />
                            <div className="text-xs text-muted-foreground">
                                {((campaign.sent_count || 0) - (campaign.failed_count || 0)).toLocaleString()} of {(campaign.sent_count || 0).toLocaleString()} sent
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Conversation Activation Analytics */}
            <Card className={isRefreshing ? "opacity-50" : ""}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Conversation Activation
                    </CardTitle>
                    <CardDescription>
                        Track how many campaign recipients engaged in conversations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {activationLoading ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-2 w-full" />
                                </div>
                            ))}
                        </div>
                    ) : activationStats ? (
                        <div className="space-y-6">
                            {/* Main Stats Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm font-medium">Total Conversations</span>
                                    </div>
                                    <div className="text-2xl font-bold">{activationStats.totalConversations}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Created from campaign
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-green-500" />
                                        <span className="text-sm font-medium">Activated</span>
                                    </div>
                                    <div className="text-2xl font-bold text-green-600">{activationStats.activatedConversations}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Customer replied
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <EyeOff className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm font-medium">Dormant</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-600">{activationStats.dormantConversations}</div>
                                    <div className="text-xs text-muted-foreground">
                                        No customer reply yet
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-orange-500" />
                                        <span className="text-sm font-medium">Avg Response Time</span>
                                    </div>
                                    <div className="text-2xl font-bold">{formatResponseTime(activationStats.avgResponseTimeHours)}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Time to first reply
                                    </div>
                                </div>
                            </div>

                            {/* Activation Rate Progress */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Activation Rate</span>
                                    <Badge variant={activationStats.activationRate >= 10 ? "default" : activationStats.activationRate >= 5 ? "secondary" : "outline"}>
                                        {activationStats.activationRate}%
                                    </Badge>
                                </div>
                                <Progress value={activationStats.activationRate} className="h-2" />
                                <div className="text-xs text-muted-foreground">
                                    {activationStats.activatedConversations} of {activationStats.totalConversations} conversations activated
                                </div>
                            </div>

                            {/* Recent Activations */}
                            {activatedDetails.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium">Recent Activations</h4>
                                    <div className="space-y-2">
                                        {activatedDetails.slice(0, 5).map((detail) => (
                                            <div key={detail.conversationId} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                                                <div>
                                                    <div className="font-medium">{detail.contactName}</div>
                                                    <div className="text-xs text-muted-foreground">{detail.phoneNumber}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-muted-foreground">
                                                        Responded after {formatResponseTime(detail.responseDelayHours)}
                                                    </div>
                                                    <div className="text-xs">
                                                        {new Date(detail.activatedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Insights */}
                            {activationStats.totalConversations > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">Insights</h4>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        {activationStats.activationRate === 0 && (
                                            <div className="flex items-center gap-2 text-orange-600">
                                                <AlertCircle className="h-4 w-4" />
                                                <span>No customer replies yet. Consider follow-up strategies.</span>
                                            </div>
                                        )}
                                        {activationStats.activationRate > 0 && activationStats.activationRate < 5 && (
                                            <div className="flex items-center gap-2 text-yellow-600">
                                                <TrendingUp className="h-4 w-4" />
                                                <span>Low activation rate. Review message content and targeting.</span>
                                            </div>
                                        )}
                                        {activationStats.activationRate >= 5 && activationStats.activationRate < 15 && (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <TrendingUp className="h-4 w-4" />
                                                <span>Good activation rate. Monitor for improvements.</span>
                                            </div>
                                        )}
                                        {activationStats.activationRate >= 15 && (
                                            <div className="flex items-center gap-2 text-green-600">
                                                <TrendingUp className="h-4 w-4" />
                                                <span>Excellent activation rate! Campaign resonating well.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No activation data available</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Message Status Breakdown */}
            {
                messages.length > 0 && (
                    <Card className={isRefreshing ? "opacity-50" : ""}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Message Status Breakdown
                            </CardTitle>
                            <CardDescription>
                                Real-time status of all messages in this campaign
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {Object.entries(messageStats).map(([status, count]) => (
                                    <div key={status} className="text-center">
                                        <div className="text-2xl font-bold">{count}</div>
                                        <Badge variant="secondary" className={`${messageStatusColors[status]} text-xs`}>
                                            {status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {/* Recent Messages */}
            <Card className={isRefreshing ? "opacity-50" : ""}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Recent Messages
                    </CardTitle>
                    <CardDescription>
                        Latest message delivery updates
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {messagesLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="h-6 w-16" />
                                </div>
                            ))}
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-8">
                            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No messages found for this campaign</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.slice(0, 10).map((message) => (
                                <div key={message.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-1">
                                        <div className="font-medium">
                                            {message.contact_name ? (
                                                <span>
                                                    {message.contact_name}
                                                    <span className="text-muted-foreground font-normal ml-2">
                                                        ({message.phone_number})
                                                    </span>
                                                </span>
                                            ) : (
                                                message.phone_number
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Sent: {new Date(message.sent_at).toLocaleString()}
                                            {message.delivered_at && (
                                                <span className="ml-2">
                                                    • Delivered: {new Date(message.delivered_at).toLocaleString()}
                                                </span>
                                            )}
                                            {message.read_at && (
                                                <span className="ml-2">
                                                    • Read: {new Date(message.read_at).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        {message.error_message && (
                                            <div className="text-xs text-red-600">
                                                Error: {message.error_message}
                                            </div>
                                        )}
                                    </div>
                                    <Badge variant="secondary" className={`${messageStatusColors[message.status]} text-xs`}>
                                        {message.status}
                                    </Badge>
                                </div>
                            ))}
                            {messages.length > 10 && (
                                <div className="text-center pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Showing 10 of {messages.length} messages
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
} 