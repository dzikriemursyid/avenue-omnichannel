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
import { useContactGroups } from "@/hooks/use-contact-groups"
import { useCreateCampaign } from "@/hooks/use-campaigns"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function CampaignCreateOptimized() {
    const { profile, loading: profileLoading, error: profileError } = useProfile()
    const { templates, loading: templatesLoading, error: templatesError } = useTemplates()
    const { groups: contactGroups, loading: groupsLoading, error: groupsError } = useContactGroups()
    const { execute: createCampaign, loading: creating, error: createError } = useCreateCampaign()
    const router = useRouter()

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        templateId: "",
        audienceId: "",
        scheduleType: "immediate", // "immediate" or "scheduled"
        scheduledDate: "",
        scheduledTime: "",
    })

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleCreateCampaign = useCallback(async () => {
        // Validation
        if (!formData.name.trim()) {
            toast.error("Please enter a campaign name")
            return
        }

        if (!formData.templateId) {
            toast.error("Please select a template")
            return
        }

        if (!formData.audienceId) {
            toast.error("Please select an audience")
            return
        }

        // Validate scheduled campaign
        if (formData.scheduleType === "scheduled") {
            if (!formData.scheduledDate || !formData.scheduledTime) {
                toast.error("Please select both date and time for scheduled campaign")
                return
            }

            const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
            const now = new Date()

            if (scheduledDateTime <= now) {
                toast.error("Scheduled time must be in the future")
                return
            }
        }

        try {
            // Prepare campaign data
            const campaignData = {
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                template_id: formData.templateId,
                audience_id: formData.audienceId,
                schedule_type: formData.scheduleType as "immediate" | "scheduled",
                scheduled_at: formData.scheduleType === "scheduled"
                    ? new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString()
                    : undefined,
            }

            // Create campaign
            const result = await createCampaign(campaignData)

            if (result) {
                const successMessage = formData.scheduleType === "immediate"
                    ? "Campaign created and sent successfully!"
                    : "Campaign scheduled successfully!"

                toast.success(successMessage)
                router.push("/dashboard/campaigns")
            }
        } catch (error: any) {
            console.error("Campaign creation error:", error)

            // Handle specific error cases
            if (error.message?.includes("Template not found")) {
                toast.error("Selected template not found. Please choose another template.")
            } else if (error.message?.includes("Contact group not found")) {
                toast.error("Selected audience not found. Please choose another audience.")
            } else if (error.message?.includes("Template must be approved")) {
                toast.error("Selected template is not approved. Please choose an approved template.")
            } else {
                toast.error(error.message || "Failed to create campaign. Please try again.")
            }
        }
    }, [formData, createCampaign, router])

    // Loading state
    if (profileLoading || templatesLoading || groupsLoading) {
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
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-10 w-full" />
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
    if (profileError || templatesError || groupsError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load campaign creation page: {(profileError || templatesError || groupsError)?.message}
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
                                                    <span className="text-xs text-muted-foreground capitalize">
                                                        {template.category} • {template.status}
                                                    </span>
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

                        <div className="space-y-2">
                            <Label htmlFor="audience">Contact Group</Label>
                            <Select
                                value={formData.audienceId}
                                onValueChange={(value) => handleInputChange("audienceId", value)}
                                disabled={creating || groupsLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a contact group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {contactGroups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4" />
                                                    <span className="font-medium">{group.name}</span>
                                                </div>
                                                <Badge variant="secondary" className="text-xs ml-2">
                                                    {group.contact_count.toLocaleString()}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {formData.audienceId && (
                                <div className="mt-3">
                                    {(() => {
                                        const selectedGroup = contactGroups.find(g => g.id === formData.audienceId)
                                        if (!selectedGroup) return null
                                        return (
                                            <Card className="bg-muted/50">
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between">
                                                        <CardTitle className="text-base">{selectedGroup.name}</CardTitle>
                                                        <Badge variant="secondary" className="text-xs">
                                                            <Users className="h-3 w-3 mr-1" />
                                                            {selectedGroup.contact_count.toLocaleString()} contacts
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                {selectedGroup.description && (
                                                    <CardContent>
                                                        <p className="text-sm text-muted-foreground">
                                                            {selectedGroup.description}
                                                        </p>
                                                    </CardContent>
                                                )}
                                            </Card>
                                        )
                                    })()}
                                </div>
                            )}
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
                                <RadioGroupItem value="immediate" id="immediate" />
                                <Label htmlFor="immediate">Send now</Label>
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
                                    {formData.scheduleType === "immediate" ? "Create & Send Campaign" : "Schedule Campaign"}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}