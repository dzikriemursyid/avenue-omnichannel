"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Calendar,
    Clock,
    AlertCircle,
    Plus,
    Search,
    RefreshCw,
    MessageSquare,
    MoreHorizontal,
    Edit,
    Trash2,
    Copy,
    CheckCircle
} from "lucide-react"
import { useState } from "react"
import { useTemplates, useDeleteTemplate, useSyncTemplates } from "@/hooks/use-templates"
import { LocalTemplate } from "@/lib/twilio/templates"
import { useProfile } from "@/hooks"
import { hasPermission } from "@/lib/supabase/rbac"
import { toast } from "sonner"
import Link from "next/link"


// Loading Skeleton Component
function TemplatesLoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <div className="flex gap-2">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-5 w-20" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

// Template Empty State Component
function TemplateEmptyState({
    searchTerm,
    categoryFilter,
    statusFilter,
    canManage,
    onSync,
    syncing
}: {
    searchTerm: string;
    categoryFilter: string;
    statusFilter: string;
    canManage: boolean;
    onSync: () => void;
    syncing: boolean;
}) {
    const hasActiveFilters = searchTerm || categoryFilter !== 'all' || statusFilter !== 'all';

    return (
        <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-xs">
                {hasActiveFilters
                    ? 'Try adjusting your search filters or reset filters.'
                    : 'No WhatsApp templates available yet.'}
            </p>
            <div className="flex gap-2">
                {canManage && (
                    <Button onClick={onSync} disabled={syncing} variant="outline">
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync from WhatsApp'}
                    </Button>
                )}
                {/* {canManage && (
                    <Button asChild>
                        <Link href="/dashboard/templates/create">
                            <Plus className="h-4 w-4 mr-2" />
                            New Template
                        </Link>
                    </Button>
                )} */}
            </div>
        </div>
    );
}

// Template Card Component
function TemplateCard({
    template,
    canManage,
    onCopy,
    onDelete,
    getStatusColor,
    getCategoryColor,
}: {
    template: LocalTemplate;
    canManage: boolean;
    onCopy: (template: LocalTemplate) => void;
    onDelete: (template: LocalTemplate) => void;
    getStatusColor: (status: string) => string;
    getCategoryColor: (category: string) => string;
}) {
    return (
        <Card className="rounded-xl shadow-md hover:shadow-lg transition-shadow border border-muted bg-white/90 dark:bg-muted/80">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base line-clamp-1 text-pretty">{template.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${getStatusColor(template.status)} text-white capitalize px-2 py-1 text-xs font-semibold shadow-sm`}>
                                {template.status}
                            </Badge>
                            <Badge
                                variant="outline"
                                className={`${getCategoryColor(template.category)} text-white border-none capitalize px-2 py-1 text-xs font-semibold`}
                            >
                                {template.category}
                            </Badge>
                            <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 text-xs px-2 py-1 font-medium border-none">
                                {template.language_code}
                            </Badge>
                        </div>
                    </div>
                    {canManage && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/templates/${template.id}`}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onCopy(template)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Content
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => onDelete(template)}
                                    className="text-red-600"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-muted-foreground mb-2">Content:</p>
                    <p className="text-sm bg-muted p-2 rounded break-words line-clamp-4 min-h-[48px] overflow-y-auto">{template.body_text}</p>
                </div>

                {template.variables && template.variables.length > 0 && (
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Variables:</p>
                        <div className="flex flex-wrap gap-1">
                            {template.variables.map((variable) => (
                                <Badge key={variable} variant="secondary" className="text-xs px-2 py-1">
                                    {`{{${variable}}}`}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(template.created_at).toLocaleDateString()}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function TemplatesManager() {
    const { profile, loading: profileLoading, error: profileError } = useProfile()
    const { templates, loading: templatesLoading, refetch } = useTemplates()
    const { execute: deleteTemplate, loading: deleting } = useDeleteTemplate()
    const { execute: syncTemplates, loading: syncing } = useSyncTemplates()

    const [searchTerm, setSearchTerm] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [templateToDelete, setTemplateToDelete] = useState<LocalTemplate | null>(null)

    const canManage = profile ? hasPermission(profile.role, "manage_campaigns") : false

    // Loading state
    if (profileLoading || templatesLoading) {
        return (
            <div className="space-y-6">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-8 w-80 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                <TemplatesLoadingSkeleton />
            </div>
        )
    }

    // Error state
    if (profileError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load page: {profileError.message}
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


    // Filter templates
    const filteredTemplates = templates.filter(template => {
        const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.body_text.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = categoryFilter === "all" || template.category === categoryFilter
        const matchesStatus = statusFilter === "all" || template.status === statusFilter

        return matchesSearch && matchesCategory && matchesStatus
    })

    // Group templates by category
    const groupedTemplates = filteredTemplates.reduce((acc, template) => {
        if (!acc[template.category]) {
            acc[template.category] = []
        }
        acc[template.category].push(template)
        return acc
    }, {} as Record<string, LocalTemplate[]>)


    const handleSync = async () => {
        try {
            await syncTemplates()
            refetch()
        } catch (error) {
            console.error("Failed to sync templates:", error)
        }
    }

    const handleDelete = async () => {
        if (!templateToDelete) return

        try {
            await deleteTemplate(templateToDelete.id)
            refetch()
            setDeleteDialogOpen(false)
            setTemplateToDelete(null)

            const message = templateToDelete.template_id?.startsWith('HX')
                ? "Template deleted from WhatsApp and local database"
                : "Template deleted successfully"

            toast.success(message)
        } catch (error) {
            console.error("Failed to delete template:", error)
            toast.error("Failed to delete template. Please try again.")
        }
    }

    const handleCopy = (template: LocalTemplate) => {
        navigator.clipboard.writeText(template.body_text)
        toast.success("Template content copied to clipboard")
    }


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return "bg-green-500"
            case 'pending':
                return "bg-yellow-500"
            case 'rejected':
                return "bg-red-500"
            default:
                return "bg-gray-500"
        }
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'marketing':
                return "bg-blue-500"
            case 'utility':
                return "bg-purple-500"
            case 'authentication':
                return "bg-orange-500"
            default:
                return "bg-gray-500"
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">WhatsApp Templates</h1>
                    <p className="text-muted-foreground">
                        Manage your WhatsApp message templates
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {canManage && (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleSync}
                                disabled={syncing}
                                className="transition-colors"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? 'Syncing...' : 'Sync from WhatsApp'}
                            </Button>
                            {/* <Button asChild className="transition-colors">
                                <Link href="/dashboard/templates/create">
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Template
                                </Link>
                            </Button> */}
                        </>
                    )}
                </div>
            </div>

            {templatesLoading ? (
                <TemplatesLoadingSkeleton />
            ) : (
                <>
                    {/* Templates Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search templates..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 rounded-lg focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] rounded-lg">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="utility">Utility</SelectItem>
                                <SelectItem value="authentication">Authentication</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] rounded-lg">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Templates Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="rounded-xl shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{templates.length}</div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {templates.filter(t => t.status === 'approved').length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                                <Clock className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {templates.filter(t => t.status === 'pending').length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-xl shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Marketing</CardTitle>
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {templates.filter(t => t.category === 'marketing').length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Templates by Category */}
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="overflow-x-auto whitespace-nowrap rounded-lg bg-muted p-1 mb-4">
                            <TabsTrigger value="all">All Templates</TabsTrigger>
                            <TabsTrigger value="marketing">Marketing</TabsTrigger>
                            <TabsTrigger value="utility">Utility</TabsTrigger>
                            <TabsTrigger value="authentication">Authentication</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all">
                            {filteredTemplates.length === 0 ? (
                                <TemplateEmptyState
                                    searchTerm={searchTerm}
                                    categoryFilter={categoryFilter}
                                    statusFilter={statusFilter}
                                    canManage={canManage}
                                    onSync={handleSync}
                                    syncing={syncing}
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredTemplates.map((template) => (
                                        <TemplateCard
                                            key={template.id}
                                            template={template}
                                            canManage={canManage}
                                            onCopy={handleCopy}
                                            onDelete={(template) => {
                                                setTemplateToDelete(template)
                                                setDeleteDialogOpen(true)
                                            }}
                                            getStatusColor={getStatusColor}
                                            getCategoryColor={getCategoryColor}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {['marketing', 'utility', 'authentication'].map((category) => (
                            <TabsContent key={category} value={category}>
                                {(!groupedTemplates[category] || groupedTemplates[category].length === 0) ? (
                                    <TemplateEmptyState
                                        searchTerm={searchTerm}
                                        categoryFilter={category}
                                        statusFilter={statusFilter}
                                        canManage={canManage}
                                        onSync={handleSync}
                                        syncing={syncing}
                                    />
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {groupedTemplates[category].map((template) => (
                                            <TemplateCard
                                                key={template.id}
                                                template={template}
                                                canManage={canManage}
                                                onCopy={handleCopy}
                                                onDelete={(template) => {
                                                    setTemplateToDelete(template)
                                                    setDeleteDialogOpen(true)
                                                }}
                                                getStatusColor={getStatusColor}
                                                getCategoryColor={getCategoryColor}
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                </>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>Are you sure you want to delete &quot;{templateToDelete?.name}&quot;?</p>
                                {templateToDelete?.template_id?.startsWith('HX') && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                                            ⚠️ This template will also be deleted from WhatsApp
                                        </p>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                            This action will remove the template from both your local database and WhatsApp Business API.
                                        </p>
                                    </div>
                                )}
                                <p className="text-sm text-muted-foreground">
                                    This action cannot be undone.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}