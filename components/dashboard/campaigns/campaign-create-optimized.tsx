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
        templateVariables: {} as Record<string, string>, // Dynamic template variables
        variableSource: "manual" as "manual" | "contact", // Source for contact-related variables
    })

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleTemplateVariableChange = (variableName: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            templateVariables: {
                ...prev.templateVariables,
                [variableName]: value
            }
        }))
    }

    // Get selected template for variables
    const selectedTemplate = templates.find(t => t.id === formData.templateId)

    // Get selected audience for contact data
    const selectedAudience = contactGroups.find(g => g.id === formData.audienceId)

    // State for contact data
    const [contactData, setContactData] = useState<any[]>([])
    const [loadingContacts, setLoadingContacts] = useState(false)

    // Function to fetch contact data from selected audience
    const fetchContactData = useCallback(async () => {
        if (!selectedAudience || selectedAudience.contact_count === 0) {
            setContactData([])
            return
        }

        setLoadingContacts(true)
        try {
            const response = await fetch(`/api/dashboard/contact-groups/${selectedAudience.id}/contacts?limit=5`)
            if (response.ok) {
                const data = await response.json()
                setContactData(data.data.contacts || [])
            } else {
                console.error('Failed to fetch contact data')
                setContactData([])
            }
        } catch (error) {
            console.error('Error fetching contact data:', error)
            setContactData([])
        } finally {
            setLoadingContacts(false)
        }
    }, [selectedAudience])

    // Fetch contact data when audience changes
    useEffect(() => {
        if (selectedAudience && formData.variableSource === "contact") {
            fetchContactData()
        }
    }, [selectedAudience, formData.variableSource, fetchContactData])

    // Function to get sample contact data from selected audience
    const getSampleContactData = useCallback(() => {
        if (!selectedAudience || selectedAudience.contact_count === 0) {
            return null
        }

        // Use actual contact data if available, otherwise return sample
        if (contactData.length > 0) {
            return contactData[0]
        }

        // Fallback sample data
        return {
            name: "John Doe",
            email: "john.doe@example.com",
            phone_number: "+6281234567890",
            company_name: "Sample Company",
            // Add more sample data as needed
        }
    }, [selectedAudience, contactData])

    // Function to auto-fill contact-related variables
    const autoFillContactVariables = useCallback(() => {
        if (!selectedTemplate?.variables || !selectedAudience) return

        const sampleContact = getSampleContactData()
        if (!sampleContact) return

        const contactVariableMappings: Record<string, string> = {
            'name': sampleContact.name, // Always use full name for name variable
            'first_name': sampleContact.name.split(' ')[0],
            'last_name': sampleContact.name.split(' ').slice(1).join(' '),
            'email': sampleContact.email,
            'phone': sampleContact.phone_number,
            'phone_number': sampleContact.phone_number,
            'company_name': sampleContact.company_name,
            'company': sampleContact.company_name,
        }

        const newVariables = { ...formData.templateVariables }
        let filledCount = 0

        selectedTemplate.variables.forEach(variable => {
            const lowerVariable = variable.toLowerCase()
            if (contactVariableMappings[lowerVariable] && !newVariables[variable]) {
                newVariables[variable] = contactVariableMappings[lowerVariable]
                filledCount++
            }
        })

        if (filledCount > 0) {
            setFormData(prev => ({
                ...prev,
                templateVariables: newVariables
            }))
            toast.success(`Auto-filled ${filledCount} contact-related variable(s)`)
        } else {
            toast.info("No contact-related variables found to auto-fill")
        }
    }, [selectedTemplate, selectedAudience, formData.templateVariables, getSampleContactData])

    // Validation function to check if form is complete
    const isFormValid = useCallback(() => {
        // Check required basic fields
        if (!formData.name.trim()) return false
        if (!formData.templateId) return false
        if (!formData.audienceId) return false

        // Check selected template exists and is approved
        if (!selectedTemplate || selectedTemplate.status !== 'approved') return false

        // Check selected audience exists and has contacts
        if (!selectedAudience || selectedAudience.contact_count === 0) return false

        // Check scheduled campaign fields
        if (formData.scheduleType === "scheduled") {
            if (!formData.scheduledDate || !formData.scheduledTime) return false

            const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
            const now = new Date()

            if (scheduledDateTime <= now) return false
        }

        // Check template variables
        if (selectedTemplate.variables && selectedTemplate.variables.length > 0) {
            if (formData.variableSource === "manual") {
                // For manual input, all variables must be filled
                const missingVariables = selectedTemplate.variables.filter(
                    variable => !formData.templateVariables[variable] || formData.templateVariables[variable].trim() === ""
                )
                if (missingVariables.length > 0) return false
            } else {
                // For contact data, only non-contact variables must be filled
                const contactVariables = ['name', 'first_name', 'last_name', 'email', 'phone', 'phone_number', 'company_name', 'company']
                const nonContactVariables = selectedTemplate.variables.filter(
                    variable => !contactVariables.includes(variable.toLowerCase())
                )

                const missingNonContactVariables = nonContactVariables.filter(
                    variable => !formData.templateVariables[variable] || formData.templateVariables[variable].trim() === ""
                )
                if (missingNonContactVariables.length > 0) return false
            }
        }

        return true
    }, [formData, selectedTemplate, selectedAudience])

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

        // Additional validation for template and audience
        if (!selectedTemplate) {
            toast.error("Please select a valid template")
            return
        }

        if (selectedTemplate.status !== 'approved') {
            toast.error("Please select an approved template")
            return
        }

        const selectedAudience = contactGroups.find(g => g.id === formData.audienceId)
        if (!selectedAudience) {
            toast.error("Please select a valid audience")
            return
        }

        if (selectedAudience.contact_count === 0) {
            toast.error("Selected audience has no contacts. Please choose an audience with contacts.")
            return
        }

        // Validate template variables
        if (selectedTemplate.variables && selectedTemplate.variables.length > 0) {
            if (formData.variableSource === "manual") {
                // For manual input, all variables must be filled
                const missingVariables = selectedTemplate.variables.filter(
                    variable => !formData.templateVariables[variable] || formData.templateVariables[variable].trim() === ""
                )

                if (missingVariables.length > 0) {
                    toast.error(`Please fill in all template variables: ${missingVariables.map(v => `{{${v}}}`).join(", ")}`)
                    return
                }
            } else {
                // For contact data, only non-contact variables must be filled
                const contactVariables = ['name', 'first_name', 'last_name', 'email', 'phone', 'phone_number', 'company_name', 'company']
                const nonContactVariables = selectedTemplate.variables.filter(
                    variable => !contactVariables.includes(variable.toLowerCase())
                )

                const missingNonContactVariables = nonContactVariables.filter(
                    variable => !formData.templateVariables[variable] || formData.templateVariables[variable].trim() === ""
                )

                if (missingNonContactVariables.length > 0) {
                    toast.error(`Please fill in non-contact variables: ${missingNonContactVariables.map(v => `{{${v}}}`).join(", ")}`)
                    return
                }
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
                template_variables: selectedTemplate.variables && selectedTemplate.variables.length > 0
                    ? formData.templateVariables
                    : undefined,
                variable_source: formData.variableSource, // Add variable source information
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

            // Handle specific error cases with more descriptive messages
            if (error.message?.includes("Template not found")) {
                toast.error("Selected template not found. Please choose another template.")
            } else if (error.message?.includes("Contact group not found")) {
                toast.error("Selected audience not found. Please choose another audience.")
            } else if (error.message?.includes("Template must be approved")) {
                toast.error("Selected template is not approved. Please choose an approved template.")
            } else if (error.message?.includes("Insufficient permissions")) {
                toast.error("You don't have permission to create campaigns. Please contact your administrator.")
            } else if (error.message?.includes("Invalid template ID")) {
                toast.error("Invalid template selected. Please choose a valid template.")
            } else if (error.message?.includes("Invalid audience ID")) {
                toast.error("Invalid audience selected. Please choose a valid contact group.")
            } else if (error.message?.includes("Scheduled time must be in the future")) {
                toast.error("Scheduled time must be in the future.")
            } else {
                toast.error(error.message || "Failed to create campaign. Please try again.")
            }
        }
    }, [formData, createCampaign, router, templates, contactGroups, selectedTemplate, isFormValid])

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
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {formData.templateId && (
                                <div className="mt-3">
                                    {(() => {
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

                                                    {/* Template Preview with Variables */}
                                                    {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                                                        <div className="mt-4">
                                                            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                                                            <div className="bg-background p-3 rounded border">
                                                                <p className="text-sm">
                                                                    {selectedTemplate.variables.reduce((preview, variable) => {
                                                                        const value = formData.templateVariables[variable] || `{{${variable}}}`;
                                                                        return preview.replace(new RegExp(`{{${variable}}}`, 'g'), value);
                                                                    }, selectedTemplate.body_text)}
                                                                </p>
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

                    {/* Template Variables */}
                    {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Template Variables</h3>
                                {selectedAudience && selectedAudience.contact_count > 0 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={autoFillContactVariables}
                                        disabled={creating}
                                        className="text-xs"
                                    >
                                        <Users className="h-3 w-3 mr-1" />
                                        Auto-fill from Contacts
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center space-x-4">
                                    <RadioGroup
                                        value={formData.variableSource}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, variableSource: value as "manual" | "contact" }))}
                                        disabled={creating}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="manual" id="manual" />
                                            <Label htmlFor="manual" className="text-sm">Manual Input</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="contact" id="contact" />
                                            <Label htmlFor="contact" className="text-sm">Use Contact Data</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {formData.variableSource === "contact" && (
                                    <div className="space-y-3">
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Variables will be automatically filled from each contact's data when sending messages.
                                                You can still provide fallback values below for contacts without complete data.
                                            </AlertDescription>
                                        </Alert>

                                        {loadingContacts ? (
                                            <div className="text-sm text-muted-foreground">
                                                Loading contact data...
                                            </div>
                                        ) : contactData.length > 0 ? (
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Sample contact data from audience:</p>
                                                <div className="bg-muted/50 p-3 rounded border">
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div><span className="font-medium">Name:</span> {contactData[0].name}</div>
                                                        <div><span className="font-medium">Email:</span> {contactData[0].email || 'Not available'}</div>
                                                        <div><span className="font-medium">Phone:</span> {contactData[0].phone_number}</div>
                                                        <div><span className="font-medium">Company:</span> {contactData[0].company_name || 'Not available'}</div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Showing sample from {contactData.length} contacts. Variables will be personalized for each contact.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : selectedAudience && selectedAudience.contact_count > 0 ? (
                                            <div className="text-sm text-muted-foreground">
                                                No contact data available. Please check your contact group.
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                <p className="text-sm text-muted-foreground">
                                    {formData.variableSource === "manual"
                                        ? "Enter values for the variables in your selected template. These values will be used for all contacts in this campaign."
                                        : "Provide fallback values for variables. These will be used if a contact doesn't have the required data."
                                    }
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedTemplate.variables.map((variable) => {
                                    const isContactVariable = ['name', 'first_name', 'last_name', 'email', 'phone', 'phone_number', 'company_name', 'company'].includes(variable.toLowerCase())

                                    return (
                                        <div key={variable} className="space-y-2">
                                            <Label htmlFor={`var-${variable}`}>
                                                {`{{${variable}}}`}
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    {variable === 'name' && '(Contact name)'}
                                                    {variable === 'first_name' && '(First name)'}
                                                    {variable === 'last_name' && '(Last name)'}
                                                    {variable === 'email' && '(Contact email)'}
                                                    {variable === 'phone' && '(Phone number)'}
                                                    {variable === 'phone_number' && '(Phone number)'}
                                                    {variable === 'company_name' && '(Company name)'}
                                                    {variable === 'company' && '(Company name)'}
                                                    {variable === 'discount_code' && '(Promo code)'}
                                                    {variable === 'discount_percentage' && '(Discount %)'}
                                                    {variable === 'expiry_date' && '(Expiry date)'}
                                                    {variable === 'product_name' && '(Product name)'}
                                                    {variable === 'price' && '(Price)'}
                                                    {variable === 'order_id' && '(Order ID)'}
                                                    {variable === 'tracking_number' && '(Tracking number)'}
                                                </span>
                                                {formData.variableSource === "contact" && isContactVariable && (
                                                    <Badge variant="secondary" className="ml-2 text-xs">
                                                        From Contact
                                                    </Badge>
                                                )}
                                            </Label>
                                            <Input
                                                id={`var-${variable}`}
                                                value={formData.templateVariables[variable] || ""}
                                                onChange={(e) => handleTemplateVariableChange(variable, e.target.value)}
                                                placeholder={
                                                    formData.variableSource === "contact" && isContactVariable
                                                        ? `Fallback for ${variable}`
                                                        : `Enter value for ${variable}`
                                                }
                                                disabled={creating}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

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
                            {/* <div className="flex items-center space-x-2">
                                <RadioGroupItem value="scheduled" id="scheduled" />
                                <Label htmlFor="scheduled">Schedule for later</Label>
                            </div> */}
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
                        <Button onClick={handleCreateCampaign} disabled={creating || !isFormValid()}>
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