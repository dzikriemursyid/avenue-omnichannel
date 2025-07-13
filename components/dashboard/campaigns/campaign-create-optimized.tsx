"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Calendar, Users, MessageSquare, Clock, Send, ArrowLeft } from "lucide-react"
import { useProfile } from "@/hooks"
import { useTemplates } from "@/hooks/use-templates"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Audience {
    id: string
    name: string
    count: number
}

export function CampaignCreateOptimized() {
    const { profile, loading: profileLoading, error: profileError } = useProfile()
    const { templates, loading: templatesLoading, error: templatesError } = useTemplates()
    const [audiences, setAudiences] = useState<Audience[]>([])
    const [audiencesLoading, setAudiencesLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const router = useRouter()

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        templateId: "",
        audienceId: "",
        scheduleType: "now", // "now" or "scheduled"
        scheduledDate: "",
        scheduledTime: "",
    })

    // Mock audiences data
    const mockAudiences: Audience[] = [
        { id: "1", name: "All Customers", count: 12500 },
        { id: "2", name: "New Customers (Last 30 days)", count: 850 },
        { id: "3", name: "Premium Customers", count: 2300 },
        { id: "4", name: "Inactive Customers", count: 4200 },
        { id: "5", name: "Test Group", count: 50 },
    ]

    // Load audiences
    useEffect(() => {
        const loadAudiences = async () => {
            setAudiencesLoading(true)
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500))
            setAudiences(mockAudiences)
            setAudiencesLoading(false)
        }

        loadAudiences()
    }, [])

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleCreateCampaign = useCallback(async () => {
        if (!formData.name || !formData.templateId || !formData.audienceId) {
            toast.error("Please fill in all required fields")
            return
        }

        setCreating(true)
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000))

            toast.success("Campaign created successfully!")
            router.push("/dashboard/campaigns")
        } catch (error) {
            toast.error("Failed to create campaign. Please try again.")
        } finally {
            setCreating(false)
        }
    }, [formData, router])

    // Loading state
    if (profileLoading || templatesLoading || audiencesLoading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Campaign Details Section */}
                        <div className="space-y-4">
                            <Skeleton className="h-5 w-32" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        </div>

                        {/* Template Selection Section */}
                        <div className="space-y-4">
                            <Skeleton className="h-5 w-40" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>

                        {/* Audience Selection Section */}
                        <div className="space-y-4">
                            <Skeleton className="h-5 w-36" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[...Array(5)].map((_, i) => (
                                    <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start">
                                                <Skeleton className="h-5 w-2/3" />
                                                <Skeleton className="h-4 w-12" />
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Scheduling Section */}
                        <div className="space-y-4">
                            <Skeleton className="h-5 w-28" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4">
                            <Skeleton className="h-10 w-20" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Error state
    if (profileError || templatesError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load campaign creation page: {(profileError || templatesError)?.message}
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
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Create New Campaign</h1>
                    <p className="text-muted-foreground">
                        Set up a new WhatsApp campaign to reach your audience
                    </p>
                </div>
            </div>

            <Card className={creating ? "opacity-50 pointer-events-none" : ""}>
                <CardHeader>
                    <CardTitle>Campaign Configuration</CardTitle>
                    <CardDescription>
                        Configure your campaign details, select a template, and choose your target audience
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Campaign Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Campaign Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Campaign Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange("name", e.target.value)}
                                    placeholder="Enter campaign name"
                                    disabled={creating}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange("description", e.target.value)}
                                    placeholder="Brief description of the campaign"
                                    disabled={creating}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Template Selection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Select Template *</h3>

                        <div className="space-y-2">
                            <Label htmlFor="template">WhatsApp Template</Label>
                            <Select
                                value={formData.templateId}
                                onValueChange={(value) => handleInputChange("templateId", value)}
                                disabled={creating || templatesLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((template) => (
                                        <SelectItem key={template.id} value={template.id}>
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{template.name}</span>
                                                    {/* <span className="text-xs text-muted-foreground capitalize">
                                                        {template.category} • {template.status}
                                                    </span> */}
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {formData.templateId && (
                                <div className="mt-3">
                                    {(() => {
                                        const selectedTemplate = templates.find(t => t.id === formData.templateId)
                                        if (!selectedTemplate) return null
                                        return (
                                            <Card className="bg-muted/50">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between">
                                                        <CardTitle className="text-base">{selectedTemplate.name}</CardTitle>
                                                        <div className="flex gap-1">
                                                            <Badge variant="outline" className="text-xs capitalize">
                                                                {selectedTemplate.category}
                                                            </Badge>
                                                            <Badge
                                                                variant={selectedTemplate.status === 'approved' ? 'default' : 'secondary'}
                                                                className="text-xs capitalize"
                                                            >
                                                                {selectedTemplate.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-muted-foreground mb-2">Content:</p>
                                                    <p className="text-sm bg-background p-2 rounded border">
                                                        {selectedTemplate.body_text}
                                                    </p>
                                                    {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                                                        <div className="mt-3">
                                                            <p className="text-sm text-muted-foreground mb-2">Variables:</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {selectedTemplate.variables.map((variable) => (
                                                                    <Badge key={variable} variant="secondary" className="text-xs">
                                                                        {`{{${variable}}}`}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Audience Selection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Select Audience *</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {audiences.map((audience) => (
                                <Card
                                    key={audience.id}
                                    className={`cursor-pointer hover:shadow-md transition-all ${formData.audienceId === audience.id ? "ring-2 ring-primary" : ""
                                        }`}
                                    onClick={() => !creating && handleInputChange("audienceId", audience.id)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base">{audience.name}</CardTitle>
                                            <Badge variant="secondary" className="text-xs">
                                                <Users className="h-3 w-3 mr-1" />
                                                {audience.count.toLocaleString()}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Scheduling */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Scheduling</h3>

                        <RadioGroup
                            value={formData.scheduleType}
                            onValueChange={(value) => handleInputChange("scheduleType", value)}
                            disabled={creating}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="now" id="now" />
                                <Label htmlFor="now">Send now</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="scheduled" id="scheduled" />
                                <Label htmlFor="scheduled">Schedule for later</Label>
                            </div>
                        </RadioGroup>

                        {formData.scheduleType === "scheduled" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={formData.scheduledDate}
                                        onChange={(e) => handleInputChange("scheduledDate", e.target.value)}
                                        disabled={creating}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="time">Time</Label>
                                    <Input
                                        id="time"
                                        type="time"
                                        value={formData.scheduledTime}
                                        onChange={(e) => handleInputChange("scheduledTime", e.target.value)}
                                        disabled={creating}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" asChild disabled={creating}>
                            <Link href="/dashboard/campaigns">
                                Cancel
                            </Link>
                        </Button>
                        <Button onClick={handleCreateCampaign} disabled={creating}>
                            {creating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Create Campaign
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}