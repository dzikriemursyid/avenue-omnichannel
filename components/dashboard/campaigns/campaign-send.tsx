"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Send, Play, Pause, Calendar, Users, Clock, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { useSendCampaign, usePauseCampaign, useResumeCampaign } from "@/hooks/use-campaigns"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Campaign {
    id: string
    name: string
    description: string
    status: "draft" | "scheduled" | "running" | "completed" | "paused" | "failed"
    template_name: string
    target_count: number
    sent_count: number
    scheduled_at: Date
    audience: string
    progress: number
}

interface CampaignSendProps {
    campaigns: Campaign[]
}

export default function CampaignSend({ campaigns }: CampaignSendProps) {
    const router = useRouter()
    const { sendCampaign, loading: sendingCampaign } = useSendCampaign()
    const { execute: pauseCampaign, loading: pausingCampaign } = usePauseCampaign()
    const { execute: resumeCampaign, loading: resumingCampaign } = useResumeCampaign()
    const [processingCampaignId, setProcessingCampaignId] = useState<string | null>(null)

    const statusColors = {
        draft: "bg-gray-500",
        scheduled: "bg-blue-500",
        running: "bg-green-500",
        completed: "bg-purple-500",
        paused: "bg-yellow-500",
        failed: "bg-red-500",
    }

    const handleSendCampaign = async (campaignId: string) => {
        try {
            setProcessingCampaignId(campaignId)
            await sendCampaign(campaignId)
            // Refresh the page to show updated status
            router.refresh()
        } catch (error) {
            console.error("Failed to send campaign:", error)
        } finally {
            setProcessingCampaignId(null)
        }
    }

    const handlePauseCampaign = async (campaignId: string) => {
        try {
            setProcessingCampaignId(campaignId)
            await pauseCampaign(campaignId)
            router.refresh()
        } catch (error) {
            console.error("Failed to pause campaign:", error)
        } finally {
            setProcessingCampaignId(null)
        }
    }

    const handleResumeCampaign = async (campaignId: string) => {
        try {
            setProcessingCampaignId(campaignId)
            await resumeCampaign(campaignId)
            router.refresh()
        } catch (error) {
            console.error("Failed to resume campaign:", error)
        } finally {
            setProcessingCampaignId(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ready to Send</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {campaigns.filter((c) => c.status === "draft" || c.status === "scheduled").length}
                        </div>
                        <p className="text-xs text-muted-foreground">Campaigns pending</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                        <Play className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {campaigns.filter((c) => c.status === "running").length}
                        </div>
                        <p className="text-xs text-muted-foreground">Currently running</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {campaigns.reduce((sum, c) => sum + c.target_count, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Across all campaigns</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {campaigns.filter((c) => c.status === "scheduled").length}
                        </div>
                        <p className="text-xs text-muted-foreground">For future delivery</p>
                    </CardContent>
                </Card>
            </div>

            {/* Campaigns List */}
            <div className="space-y-4">
                {campaigns.map((campaign) => (
                    <Card key={campaign.id}>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <CardTitle className="text-lg truncate">{campaign.name}</CardTitle>
                                        <Badge className={`${statusColors[campaign.status]} text-white w-fit`}>
                                            {campaign.status}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-sm">{campaign.description}</CardDescription>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {campaign.status === "draft" && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleSendCampaign(campaign.id)}
                                            disabled={processingCampaignId === campaign.id || sendingCampaign}
                                        >
                                            <Send className="h-4 w-4 mr-2" />
                                            {processingCampaignId === campaign.id ? "Sending..." : "Send Now"}
                                        </Button>
                                    )}
                                    {campaign.status === "scheduled" && (
                                        <Button variant="outline" size="sm">
                                            <Clock className="h-4 w-4 mr-2" />
                                            Reschedule
                                        </Button>
                                    )}
                                    {campaign.status === "running" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePauseCampaign(campaign.id)}
                                            disabled={processingCampaignId === campaign.id || pausingCampaign}
                                        >
                                            <Pause className="h-4 w-4 mr-2" />
                                            {processingCampaignId === campaign.id ? "Pausing..." : "Pause"}
                                        </Button>
                                    )}
                                    {campaign.status === "paused" && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleResumeCampaign(campaign.id)}
                                            disabled={processingCampaignId === campaign.id || resumingCampaign}
                                        >
                                            <Play className="h-4 w-4 mr-2" />
                                            {processingCampaignId === campaign.id ? "Resuming..." : "Resume"}
                                        </Button>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>View Details</DropdownMenuItem>
                                            <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
                                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span>Progress</span>
                                        <span>{campaign.progress}%</span>
                                    </div>
                                    <Progress value={campaign.progress} className="w-full" />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{campaign.sent_count.toLocaleString()} sent</span>
                                        <span>{campaign.target_count.toLocaleString()} total</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Template:</span>
                                            <div className="font-medium">{campaign.template_name}</div>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Audience:</span>
                                            <div className="font-medium">{campaign.audience}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {campaign.status === "scheduled"
                                                ? `Scheduled: ${campaign.scheduled_at.toLocaleDateString()}`
                                                : campaign.status === "completed"
                                                    ? `Completed: ${campaign.scheduled_at.toLocaleDateString()}`
                                                    : `Created: ${campaign.scheduled_at.toLocaleDateString()}`}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Status-specific messages */}
                            {campaign.status === "draft" && (
                                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm text-blue-800">
                                        This campaign is ready to send. Click &quot;Send Now&quot; to start delivery.
                                    </span>
                                </div>
                            )}
                            {campaign.status === "scheduled" && (
                                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <Clock className="h-4 w-4 text-yellow-600" />
                                    <span className="text-sm text-yellow-800">
                                        Scheduled to send on {campaign.scheduled_at.toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                            {campaign.status === "paused" && (
                                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                    <Pause className="h-4 w-4 text-orange-600" />
                                    <span className="text-sm text-orange-800">
                                        Campaign is paused. Click &quot;Resume&quot; to continue sending.
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
} 