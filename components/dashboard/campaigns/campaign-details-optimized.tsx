"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Calendar,
    Users,
    Send,
    TrendingUp,
    AlertCircle,
    ArrowLeft,
    RefreshCw,
    Play,
    Pause,
    Edit,
} from "lucide-react"
import { useProfile } from "@/hooks"
import { hasPermission } from "@/lib/supabase/rbac"
import { toast } from "sonner"
import Link from "next/link"

interface Campaign {
    id: string
    name: string
    description: string
    status: "draft" | "scheduled" | "running" | "completed" | "paused" | "failed"
    template_name: string
    target_count: number
    sent_count: number
    delivered_count: number
    read_count: number
    failed_count: number
    scheduled_at: Date
    created_by: string
    created_at: Date
    audience: string
    batch_size: number
    send_schedule: string
    message_content: string
}

interface DeliveryStat {
    date: string
    sent: number
    delivered: number
    read: number
    failed: number
}

interface CampaignDetailsOptimizedProps {
    campaignId: string
}

export function CampaignDetailsOptimized({ campaignId }: CampaignDetailsOptimizedProps) {
    const { profile, loading: profileLoading, error: profileError } = useProfile()
    const [campaign, setCampaign] = useState<Campaign | null>(null)
    const [deliveryStats, setDeliveryStats] = useState<DeliveryStat[]>([])
    const [campaignLoading, setCampaignLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Mock campaign data
    const mockCampaign: Campaign = {
        id: campaignId,
        name: "Welcome Series",
        description: "Onboarding sequence for new customers with personalized welcome messages and product introductions.",
        status: "running",
        template_name: "Welcome Template",
        target_count: 1250,
        sent_count: 980,
        delivered_count: 945,
        read_count: 678,
        failed_count: 35,
        scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
        created_by: "Sarah Wilson",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        audience: "New Customers (Last 30 days)",
        batch_size: 1000,
        send_schedule: "immediate",
        message_content: "Hello {{1}}! Welcome to our service. We're excited to have you on board. Here's your personalized welcome message with exclusive offers just for you.",
    }

    // Mock delivery stats
    const mockDeliveryStats: DeliveryStat[] = [
        { date: "2024-01-15", sent: 150, delivered: 145, read: 98, failed: 5 },
        { date: "2024-01-16", sent: 200, delivered: 195, read: 134, failed: 5 },
        { date: "2024-01-17", sent: 180, delivered: 175, read: 120, failed: 5 },
        { date: "2024-01-18", sent: 220, delivered: 215, read: 156, failed: 5 },
        { date: "2024-01-19", sent: 230, delivered: 215, read: 170, failed: 15 },
    ]

    // Load campaign data
    useEffect(() => {
        const loadCampaign = async () => {
            setCampaignLoading(true)
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000))
            setCampaign(mockCampaign)
            setDeliveryStats(mockDeliveryStats)
            setCampaignLoading(false)
        }

        loadCampaign()
    }, [campaignId])

    // Manual refresh with loading state
    const handleManualRefresh = useCallback(async () => {
        setIsRefreshing(true)
        try {
            // Simulate refresh delay
            await new Promise(resolve => setTimeout(resolve, 800))
            setCampaign(mockCampaign)
            setDeliveryStats(mockDeliveryStats)
            toast.success("Campaign data refreshed")
        } catch (error) {
            toast.error("Failed to refresh campaign data")
        } finally {
            setIsRefreshing(false)
        }
    }, [])

    const statusColors = {
        draft: "bg-gray-500",
        scheduled: "bg-blue-500",
        running: "bg-green-500",
        completed: "bg-purple-500",
        paused: "bg-yellow-500",
        failed: "bg-red-500",
    }

    // Loading state
    if (profileLoading || campaignLoading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-5 w-48" />
                    </div>
                </div>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-1" />
                                <Skeleton className="h-3 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Campaign Progress Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-8" />
                            </div>
                            <Skeleton className="h-2 w-full" />
                            <div className="flex justify-between">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Campaign Details Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-36" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-32 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Error state
    if (profileError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load campaign details: {profileError.message}
                </AlertDescription>
            </Alert>
        )
    }

    // No profile data
    if (!profile || !campaign) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    No campaign data available. Please check your authentication or try refreshing the page.
                </AlertDescription>
            </Alert>
        )
    }

    const canManage = hasPermission(profile.role, "manage_campaigns")

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/campaigns">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{campaign.name}</h1>
                            <Badge className={`${statusColors[campaign.status]} text-white`}>
                                {campaign.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">{campaign.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    {canManage && (
                        <Button size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Campaign
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{campaign.sent_count.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            of {campaign.target_count.toLocaleString()} total
                        </p>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{campaign.delivered_count.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {Math.round((campaign.delivered_count / campaign.sent_count) * 100)}% delivery rate
                        </p>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Read</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{campaign.read_count.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {Math.round((campaign.read_count / campaign.delivered_count) * 100)}% read rate
                        </p>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{campaign.failed_count.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {Math.round((campaign.failed_count / campaign.sent_count) * 100)}% failure rate
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Campaign Progress */}
            <Card className={isRefreshing ? "opacity-50" : ""}>
                <CardHeader>
                    <CardTitle>Campaign Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
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
                </CardContent>
            </Card>

            {/* Campaign Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader>
                        <CardTitle>Campaign Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Template</span>
                            <span className="font-medium">{campaign.template_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Audience</span>
                            <span className="font-medium">{campaign.audience}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Created by</span>
                            <span className="font-medium">{campaign.created_by}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Created</span>
                            <span className="font-medium">{campaign.created_at.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Scheduled</span>
                            <span className="font-medium">{campaign.scheduled_at.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Batch Size</span>
                            <span className="font-medium">{campaign.batch_size.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader>
                        <CardTitle>Message Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{campaign.message_content}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}