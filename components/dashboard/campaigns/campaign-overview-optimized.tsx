"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Send, Calendar, Users, TrendingUp, MoreHorizontal, ExternalLink, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { hasPermission } from "@/lib/supabase/rbac"
import { useProfile } from "@/hooks"
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
    scheduled_at: Date
    created_by: string
    created_at: Date
}

export function CampaignOverviewOptimized() {
    const { profile, loading: profileLoading, error: profileError } = useProfile()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [campaignsLoading, setCampaignsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Mock campaign data - in real app this would come from a hook
    const mockCampaigns: Campaign[] = [
        {
            id: "1",
            name: "Welcome Series",
            description: "Onboarding sequence for new customers",
            status: "running",
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
            status: "scheduled",
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
            status: "completed",
            template_name: "Feedback Request",
            target_count: 800,
            sent_count: 800,
            delivered_count: 785,
            read_count: 542,
            scheduled_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
            created_by: "Lisa Chen",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
        },
        {
            id: "4",
            name: "Holiday Promotion",
            description: "Special holiday offers and discounts",
            status: "draft",
            template_name: "Holiday Promo",
            target_count: 3000,
            sent_count: 0,
            delivered_count: 0,
            read_count: 0,
            scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // In 2 weeks
            created_by: "Alex Rodriguez",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
        },
        {
            id: "5",
            name: "Weekly Newsletter",
            description: "Weekly updates and industry insights",
            status: "paused",
            template_name: "Newsletter Template",
            target_count: 2000,
            sent_count: 1200,
            delivered_count: 1150,
            read_count: 890,
            scheduled_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
            created_by: "Emma Thompson",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
        },
    ]

    // Simulate loading campaigns
    useEffect(() => {
        const loadCampaigns = async () => {
            setCampaignsLoading(true)
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000))
            setCampaigns(mockCampaigns)
            setCampaignsLoading(false)
        }

        loadCampaigns()
    }, [])

    // Manual refresh with loading state
    const handleManualRefresh = useCallback(async () => {
        setIsRefreshing(true)
        try {
            // Simulate refresh delay
            await new Promise(resolve => setTimeout(resolve, 800))
            setCampaigns(mockCampaigns)
            toast.success("Campaigns data refreshed")
        } catch (error) {
            toast.error("Failed to refresh campaigns data")
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
    if (profileLoading || campaignsLoading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                </div>

                {/* Campaign Stats Skeleton */}
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
    if (profileError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load campaigns: {profileError.message}
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

            {/* Campaign Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className={isRefreshing ? "opacity-50" : ""}>
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
                
                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {campaigns.reduce((sum, c) => sum + c.target_count, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Across all campaigns</p>
                    </CardContent>
                </Card>
                
                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {campaigns.reduce((sum, c) => sum + c.sent_count, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Total delivered</p>
                    </CardContent>
                </Card>
                
                <Card className={isRefreshing ? "opacity-50" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {campaigns.length > 0 
                                ? Math.round((campaigns.reduce((sum, c) => sum + c.delivered_count, 0) / campaigns.reduce((sum, c) => sum + c.sent_count, 1)) * 100)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Delivery rate</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Campaigns */}
            <Card className={isRefreshing ? "opacity-50 pointer-events-none" : ""}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Recent Campaigns</CardTitle>
                            <CardDescription>Overview of your latest campaign activities</CardDescription>
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
                            <p className="text-muted-foreground">No campaigns available.</p>
                            {hasPermission(profile.role, "manage_campaigns") && (
                                <div className="mt-4">
                                    <Button asChild>
                                        <Link href="/dashboard/campaigns/create">
                                            <Send className="h-4 w-4 mr-2" />
                                            Create First Campaign
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {campaigns.map((campaign) => (
                                <div key={campaign.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            <h4 className="font-semibold">{campaign.name}</h4>
                                            <Badge className={`${statusColors[campaign.status]} text-white w-fit`}>
                                                {campaign.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                                        <div className="flex flex-col sm:flex-row gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Created {campaign.created_at.toLocaleDateString()}
                                            </span>
                                            <span>Template: {campaign.template_name}</span>
                                            <span>By: {campaign.created_by}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 min-w-0 sm:w-64">
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

                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/dashboard/campaigns/${campaign.id}`}>
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View
                                            </Link>
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
                                                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                                <DropdownMenuItem>View Analytics</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}