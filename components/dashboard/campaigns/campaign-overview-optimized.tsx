"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Send, Calendar, Users, TrendingUp, ExternalLink, RefreshCw, Eye, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { hasPermission } from "@/lib/supabase/rbac"
import { useProfile, useCampaigns } from "@/hooks"
import { toast } from "sonner"
import Link from "next/link"

import type { Campaign } from "@/lib/api/campaigns"

export function CampaignOverviewOptimized() {
    const { profile, loading: profileLoading, error: profileError } = useProfile()
    const { campaigns, loading: campaignsLoading, error: campaignsError, refetch } = useCampaigns()
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [autoRefresh, setAutoRefresh] = useState(true)

    // Callback-based refresh system - only refresh when there are running campaigns with recent activity
    useEffect(() => {
        if (!autoRefresh || !campaigns || campaigns.length === 0) return

        const runningCampaigns = campaigns.filter(c => c.status === 'running')

        if (runningCampaigns.length > 0) {
            // Check for recent analytics activity (within last 10 minutes)
            const hasRecentActivity = runningCampaigns.some(campaign => {
                if (!campaign.analytics_updated_at) return false
                const updateTime = new Date(campaign.analytics_updated_at).getTime()
                return (Date.now() - updateTime) < 10 * 60 * 1000
            })

            if (hasRecentActivity) {
                const interval = setInterval(() => {
                    refetch()
                }, 45000) // Check every 45 seconds for webhook updates

                return () => clearInterval(interval)
            }
        }
    }, [autoRefresh, campaigns, refetch])

    // Manual refresh with loading state
    const handleManualRefresh = useCallback(async () => {
        setIsRefreshing(true)
        try {
            await refetch()
            toast.success("Campaigns data refreshed")
        } catch (error) {
            toast.error("Failed to refresh campaigns data")
        } finally {
            setIsRefreshing(false)
        }
    }, [refetch])

    const statusColors = {
        draft: "bg-gray-500",
        scheduled: "bg-blue-500",
        running: "bg-green-500",
        completed: "bg-purple-500",
        paused: "bg-yellow-500",
        failed: "bg-red-500",
    }

    const statusIcons = {
        draft: Clock,
        scheduled: Calendar,
        running: Send,
        completed: CheckCircle,
        paused: AlertCircle,
        failed: XCircle,
    }

    // Calculate enhanced analytics
    const analytics = {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'running').length,
        completedCampaigns: campaigns.filter(c => c.status === 'completed').length,
        totalRecipients: campaigns.reduce((sum, c) => sum + (c.target_count || 0), 0),
        totalSent: campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0),
        totalDelivered: campaigns.reduce((sum, c) => sum + (c.delivered_count || 0), 0),
        totalRead: campaigns.reduce((sum, c) => sum + (c.read_count || 0), 0),
        totalFailed: campaigns.reduce((sum, c) => sum + (c.failed_count || 0), 0),
        // Use API-calculated rates if available
        deliveryRate: campaigns.length > 0 ? Math.round((campaigns.reduce((sum, c) => sum + (c.delivery_rate || 0), 0)) / campaigns.length) : 0,
        readRate: campaigns.length > 0 ? Math.round((campaigns.reduce((sum, c) => sum + (c.read_rate || 0), 0)) / campaigns.length) : 0,
    }

    // Calculate effective delivered count - if a message is read, it was logically delivered
    const totalEffectiveDelivered = campaigns.reduce((sum, c) => sum + Math.max(c.delivered_count || 0, c.read_count || 0), 0)

    // Prefer API-calculated rates if available, else fallback to manual calculation with effective delivered count
    const deliveryRate = analytics.deliveryRate > 0 ? analytics.deliveryRate : (analytics.totalSent > 0 ? Math.round((totalEffectiveDelivered / analytics.totalSent) * 100) : 0)
    const readRate = analytics.readRate > 0 ? analytics.readRate : (totalEffectiveDelivered > 0 ? Math.round((analytics.totalRead / totalEffectiveDelivered) * 100) : 0)

    // Loading state
    if (profileLoading || campaignsLoading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>

                {/* Campaign Stats Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
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

                {/* Recent Campaigns Skeleton */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                            <Skeleton className="h-9 w-32" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                    <Skeleton className="h-4 w-48" />
                                    <div className="flex gap-4 text-xs">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-3 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <div className="space-y-2 min-w-0 sm:w-64">
                                    <div className="flex justify-between text-sm">
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-4 w-8" />
                                    </div>
                                    <Skeleton className="h-2 w-full" />
                                    <div className="flex justify-between text-xs">
                                        <Skeleton className="h-3 w-12" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Skeleton className="h-8 w-20" />
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Error state
    if (profileError || campaignsError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load campaigns: {(profileError || campaignsError)?.message}
                </AlertDescription>
            </Alert>
        )
    }

    // No profile data
    if (!profile) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    No profile data available. Please check your authentication or try refreshing the page.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Campaign Overview</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        {profile.role === "leader"
                            ? "Manage your team's campaigns and track performance"
                            : profile.role === "general_manager"
                                ? "Oversee all campaigns across teams"
                                : profile.role === "admin"
                                    ? "Full campaign management and analytics access"
                                    : "View campaign performance and metrics"}
                    </p>
                </div>
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
                                const runningCampaigns = campaigns.filter(c => c.status === 'running')
                                if (runningCampaigns.length === 0) return '(idle)'

                                const hasActivity = runningCampaigns.some(campaign => {
                                    const sentCount = campaign.sent_count || 0
                                    const deliveredCount = campaign.delivered_count || 0
                                    const deliveryRate = sentCount > 0 ? (deliveredCount / sentCount) * 100 : 0
                                    return sentCount > 0 && deliveryRate < 90
                                })

                                return hasActivity ? '(active)' : '(monitoring)'
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
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                </div>
            </div>

            {/* Enhanced Campaign Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalCampaigns}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.activeCampaigns} running, {analytics.completedCampaigns} completed
                        </p>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalSent.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            of {analytics.totalRecipients.toLocaleString()} recipients
                        </p>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEffectiveDelivered.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {deliveryRate}% delivery rate
                        </p>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Read</CardTitle>
                        <Eye className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalRead.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {readRate}% read rate
                        </p>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalFailed.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.totalSent > 0 ? Math.round((analytics.totalFailed / analytics.totalSent) * 100) : 0}% failure rate
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Campaigns */}
            <Card className={isRefreshing ? "opacity-50 pointer-events-none" : ""}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Recent Campaigns</CardTitle>
                            <CardDescription>
                                Overview of your latest campaign activities
                                {analytics.activeCampaigns > 0 && (
                                    <span className="ml-2 text-green-600">
                                        • {analytics.activeCampaigns} campaign{analytics.activeCampaigns > 1 ? 's' : ''} running
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                        {hasPermission(profile.role, "manage_campaigns") && (
                            <Button asChild>
                                <Link href="/dashboard/campaigns/create">
                                    <Send className="h-4 w-4 mr-2" />
                                    New Campaign
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {campaigns.length === 0 ? (
                        <div className="text-center py-8">
                            <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Create your first campaign to start reaching your audience
                            </p>
                            {hasPermission(profile.role, "manage_campaigns") && (
                                <Button asChild>
                                    <Link href="/dashboard/campaigns/create">
                                        <Send className="h-4 w-4 mr-2" />
                                        Create Campaign
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {campaigns.map((campaign) => {
                                const StatusIcon = statusIcons[campaign.status]
                                const progress = Math.round(((campaign.sent_count || 0) / Math.max(campaign.target_count || 1, 1)) * 100)
                                // Calculate effective delivered count - if a message is read, it was logically delivered
                                const effectiveDeliveredCount = Math.max(campaign.delivered_count || 0, campaign.read_count || 0)
                                const cardDeliveryRate = typeof campaign.delivery_rate === 'number' && campaign.delivery_rate > 0
                                    ? Math.round(campaign.delivery_rate)
                                    : (campaign.sent_count || 0) > 0
                                        ? Math.round((effectiveDeliveredCount / (campaign.sent_count || 1)) * 100)
                                        : 0
                                const cardReadRate = typeof campaign.read_rate === 'number' && campaign.read_rate > 0
                                    ? Math.round(campaign.read_rate)
                                    : effectiveDeliveredCount > 0
                                        ? Math.round(((campaign.read_count || 0) / effectiveDeliveredCount) * 100)
                                        : 0

                                return (
                                    <div key={campaign.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-base truncate">{campaign.name}</h3>
                                                <Badge variant="secondary" className={`${statusColors[campaign.status]} text-white flex items-center gap-1`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {campaign.status}
                                                </Badge>
                                                {campaign.status === 'running' && (
                                                    <div className="flex items-center gap-1 text-green-600">
                                                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                                        <span className="text-xs">Live</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">{campaign.description}</p>
                                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {(campaign.target_count || 0).toLocaleString()} recipients
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Send className="h-3 w-3" />
                                                    {(campaign.sent_count || 0).toLocaleString()} sent
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3" />
                                                    {cardDeliveryRate}% delivered
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Eye className="h-3 w-3" />
                                                    {cardReadRate}% read
                                                </span>
                                                {(campaign.failed_count || 0) > 0 && (
                                                    <span className="flex items-center gap-1 text-red-600">
                                                        <XCircle className="h-3 w-3" />
                                                        {campaign.failed_count || 0} failed
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3 min-w-0 sm:w-64">
                                            {/* Sent Progress */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span>Sent</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <Progress value={progress} className="w-full" />
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>{(campaign.sent_count || 0).toLocaleString()} sent</span>
                                                    <span>{(campaign.target_count || 0).toLocaleString()} total</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/dashboard/campaigns/${campaign.id}`}>
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    View Details
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
}