import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
    Send,
    Play,
    Pause,
    Calendar,
    Clock,
    BarChart3,
    Eye,
    CheckCircle,
    XCircle,
    ArrowLeft
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
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

interface CampaignDetailsProps {
    campaign: Campaign
    deliveryStats: DeliveryStat[]
}

export default function CampaignDetails({ campaign, deliveryStats }: CampaignDetailsProps) {
    const statusColors = {
        draft: "bg-gray-500",
        scheduled: "bg-blue-500",
        running: "bg-green-500",
        completed: "bg-purple-500",
        paused: "bg-yellow-500",
        failed: "bg-red-500",
    }

    const progress = Math.round((campaign.sent_count / campaign.target_count) * 100)
    const deliveryRate = campaign.sent_count > 0 ? Math.round((campaign.delivered_count / campaign.sent_count) * 100) : 0
    const readRate = campaign.sent_count > 0 ? Math.round((campaign.read_count / campaign.sent_count) * 100) : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard/campaigns">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
                        <div className="flex items-center gap-2">
                            <Badge className={`${statusColors[campaign.status]} text-white`}>
                                {campaign.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                Created by {campaign.created_by} on {campaign.created_at.toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {campaign.status === "draft" && (
                        <Button>
                            <Send className="h-4 w-4 mr-2" />
                            Send Campaign
                        </Button>
                    )}
                    {campaign.status === "scheduled" && (
                        <Button variant="outline">
                            <Clock className="h-4 w-4 mr-2" />
                            Reschedule
                        </Button>
                    )}
                    {campaign.status === "running" && (
                        <Button variant="outline">
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                        </Button>
                    )}
                    {campaign.status === "paused" && (
                        <Button>
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem>Export Data</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Campaign Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Progress</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{progress}%</div>
                        <Progress value={progress} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                            {campaign.sent_count.toLocaleString()} of {campaign.target_count.toLocaleString()} sent
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{deliveryRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {campaign.delivered_count.toLocaleString()} delivered
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{readRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {campaign.read_count.toLocaleString()} read
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed</CardTitle>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{campaign.failed_count}</div>
                        <p className="text-xs text-muted-foreground">
                            {campaign.failed_count > 0 ? Math.round((campaign.failed_count / campaign.sent_count) * 100) : 0}% failure rate
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Campaign Details Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="recipients">Recipients</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Campaign Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium">Description</Label>
                                    <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium">Template</Label>
                                        <p className="text-sm text-muted-foreground mt-1">{campaign.template_name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Audience</Label>
                                        <p className="text-sm text-muted-foreground mt-1">{campaign.audience}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Message Content</Label>
                                    <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                                        {campaign.message_content}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Delivery Timeline</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    {deliveryStats.map((stat, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">{stat.date}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-green-600">{stat.delivered} delivered</span>
                                                <span className="text-blue-600">{stat.read} read</span>
                                                <span className="text-red-600">{stat.failed} failed</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Analytics</CardTitle>
                            <CardDescription>
                                Detailed performance metrics and trends for this campaign.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 flex items-center justify-center border rounded-lg">
                                <p className="text-muted-foreground">Performance charts will be displayed here</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="recipients" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recipient List</CardTitle>
                            <CardDescription>
                                View and manage campaign recipients.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 flex items-center justify-center border rounded-lg">
                                <p className="text-muted-foreground">Recipient list will be displayed here</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium">Send Schedule</Label>
                                    <p className="text-sm text-muted-foreground mt-1">{campaign.send_schedule}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Batch Size</Label>
                                    <p className="text-sm text-muted-foreground mt-1">{campaign.batch_size.toLocaleString()}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Created By</Label>
                                    <p className="text-sm text-muted-foreground mt-1">{campaign.created_by}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Created Date</Label>
                                    <p className="text-sm text-muted-foreground mt-1">{campaign.created_at.toLocaleDateString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
} 