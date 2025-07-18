"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Users,
    Phone,
    Search,
    Edit,
    Trash2,
    MoreHorizontal,
    AlertCircle,
    UserPlus,
    Filter,
    FolderOpen
} from "lucide-react"
import { useProfile, useContacts, useCreateContact, useUpdateContact, useDeleteContact } from "@/hooks"
import { useContactGroups, useContactGroupContacts } from "@/hooks/use-contact-groups"
import { hasPermission } from "@/lib/supabase/rbac"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Contact } from "@/lib/api/contacts"
import { useDebounce } from "@/hooks/use-debounce"
import { ContactsCSVManager } from "./contacts-csv-manager"


interface ContactsManagerProps {
    groupId?: string;
    searchTerm?: string;
    showGroupFilters?: boolean;
    showCSVActions?: boolean;
}

export function ContactsManager({
    groupId,
    searchTerm: externalSearchTerm,
    showGroupFilters = true,
    showCSVActions = false
}: ContactsManagerProps = {}) {
    const { profile, loading: profileLoading, error: profileError } = useProfile()
    const { groups } = useContactGroups() // For group selector
    const [searchTerm, setSearchTerm] = useState(externalSearchTerm || "")
    const [selectedGroup, setSelectedGroup] = useState<string | null>(groupId || null)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [editingContact, setEditingContact] = useState<Contact | null>(null)
    const [deletingContact, setDeleteDialogContact] = useState<Contact | null>(null)

    // Use external search term if provided, otherwise use internal state
    const effectiveSearchTerm = externalSearchTerm || searchTerm

    // Debounce search term to prevent excessive API calls
    const debouncedSearchTerm = useDebounce(effectiveSearchTerm, 300)

    // Create stable params object for the hook
    const contactsParams = useMemo(() => ({
        search: debouncedSearchTerm || undefined,
        limit: 50,
        page: 1,
        sort: "created_at",
        order: "desc" as const
    }), [debouncedSearchTerm])

    // Use appropriate hook based on groupId
    const isGroupSpecific = groupId && groupId !== "all"

    // Prepare params for both hooks
    const groupContactsParams = useMemo(() => {
        const params: { limit: number; page: number; search?: string } = {
            limit: 50,
            page: 1,
        }
        if (debouncedSearchTerm) {
            params.search = debouncedSearchTerm
        }
        return params
    }, [debouncedSearchTerm])

    // Always call both hooks but only use the appropriate result
    const groupContactsResult = useContactGroupContacts(
        isGroupSpecific ? groupId : "",
        isGroupSpecific ? groupContactsParams : { limit: 50, page: 1 }
    )

    const generalContactsResult = useContacts(!isGroupSpecific ? contactsParams : { limit: 50, page: 1, sort: "created_at", order: "desc" as const })
    
    // Get all contacts for duplicate checking with safe limit of 100
    const allContactsParams = useMemo(() => ({
        limit: 100, // Safe limit as requested
        page: 1,
        sort: "created_at",
        order: "desc" as const
    }), [])
    
    const allContactsResult = useContacts(showCSVActions ? allContactsParams : { limit: 50, page: 1, sort: "created_at", order: "desc" as const })
    
    // Use allContacts only if there's no error
    const safeAllContacts = allContactsResult.error ? undefined : allContactsResult.contacts

    // Select the appropriate result based on context
    const {
        contacts,
        pagination,
        loading: contactsLoading,
        error: contactsError,
        refetch
    } = isGroupSpecific
            ? {
                contacts: groupContactsResult.contacts || [],
                pagination: groupContactsResult.pagination,
                loading: groupContactsResult.loading,
                error: groupContactsResult.error,
                refetch: groupContactsResult.refresh
            }
            : {
                contacts: generalContactsResult.contacts || [],
                pagination: generalContactsResult.pagination,
                loading: generalContactsResult.loading,
                error: generalContactsResult.error,
                refetch: generalContactsResult.refetch
            }



    // No need for client-side filtering since both APIs handle search
    const filteredContacts = contacts

    // Mutation hooks
    const createContactMutation = useCreateContact()
    const updateContactMutation = useUpdateContact()
    const deleteContactMutation = useDeleteContact()

    // Phone number normalization function
    const normalizePhoneNumber = useCallback((phone: string) => {
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '')
        
        // If empty, return empty string
        if (!digits) return phone
        
        // Handle different Indonesian phone number formats
        if (digits.startsWith('62')) {
            // Already has 62 country code, ensure it starts with +62
            return '+' + digits
        } else if (digits.startsWith('0')) {
            // Starts with 0, replace with +62
            return '+62' + digits.substring(1)
        } else if (digits.length >= 9 && digits.length <= 13) {
            // Assume it's Indonesian mobile number without country code or leading 0
            return '+62' + digits
        }
        
        // If it doesn't match Indonesian patterns, return as-is but ensure + prefix for international
        if (!phone.startsWith('+')) {
            return '+' + digits
        }
        
        return phone
    }, [])

    // Form state for create/edit - now includes group selection
    const [formData, setFormData] = useState({
        name: "",
        phone_number: "",
        group_id: "none",
    })

    const handleInputChange = useCallback((field: string, value: string) => {
        // Apply phone number normalization for phone_number field
        if (field === 'phone_number') {
            value = normalizePhoneNumber(value)
        }
        setFormData(prev => ({ ...prev, [field]: value }))
    }, [normalizePhoneNumber])

    const resetForm = useCallback(() => {
        setFormData({
            name: "",
            phone_number: "",
            group_id: "none",
        })
        setEditingContact(null)
    }, [])

    const validatePhoneNumber = useCallback((phone: string) => {
        // Basic validation for international format
        const phoneRegex = /^\+[1-9]\d{1,14}$/
        return phoneRegex.test(phone)
    }, [])

    const handleCreate = useCallback(async () => {
        // Validation
        if (!formData.name.trim()) {
            toast.error("Please enter a contact name")
            return
        }

        if (!formData.phone_number.trim()) {
            toast.error("Please enter a phone number")
            return
        }

        if (!validatePhoneNumber(formData.phone_number)) {
            toast.error("Please enter a valid phone number with country code (e.g., +6281234567890)")
            return
        }

        try {
            const contactData: any = {
                name: formData.name.trim(),
                phone_number: formData.phone_number.trim(),
            };

            // Handle group assignment logic
            if (formData.group_id && formData.group_id !== "none") {
                // User explicitly selected a group
                contactData.group_id = formData.group_id;
            } else if (groupId && groupId !== "all") {
                // Auto-assign current group if we're in a specific group context and no group selected
                contactData.group_id = groupId;
            }
            // If "none" selected or in "all" context, group_id will be null

            await createContactMutation.execute(contactData)

            resetForm()
            setShowCreateDialog(false)
            refetch() // Refresh the contacts list
        } catch (error) {
            // Error handling is done by the hook
        }
    }, [formData, createContactMutation, resetForm, validatePhoneNumber, refetch, groupId])

    const handleEdit = useCallback((contact: Contact) => {
        setEditingContact(contact)
        setFormData({
            name: contact.name || "",
            phone_number: contact.phone_number,
            group_id: contact.group_id || "none",
        })
        setShowCreateDialog(true)
    }, [])

    const handleAdd = useCallback(() => {
        // Set default group based on current context
        let defaultGroupId = "none"
        if (groupId && groupId !== "all") {
            // If we're in a specific group, default to that group
            defaultGroupId = groupId
        }

        setFormData({
            name: "",
            phone_number: "",
            group_id: defaultGroupId,
        })
        setEditingContact(null)
        setShowCreateDialog(true)
    }, [groupId])

    const handleUpdate = useCallback(async () => {
        if (!editingContact) return

        // Validation
        if (!formData.name.trim()) {
            toast.error("Please enter a contact name")
            return
        }

        if (!formData.phone_number.trim()) {
            toast.error("Please enter a phone number")
            return
        }

        if (!validatePhoneNumber(formData.phone_number)) {
            toast.error("Please enter a valid phone number with country code (e.g., +6281234567890)")
            return
        }

        try {
            const updateData: any = {
                name: formData.name.trim(),
                phone_number: formData.phone_number.trim(),
            };

            // Handle group assignment
            if (formData.group_id && formData.group_id !== "none") {
                updateData.group_id = formData.group_id;
            } else {
                updateData.group_id = null; // Explicitly set to null if "none" selected
            }

            await updateContactMutation.execute(editingContact.id, updateData)

            resetForm()
            setShowCreateDialog(false)
            refetch() // Refresh the contacts list
        } catch (error) {
            // Error handling is done by the hook
        }
    }, [editingContact, formData, updateContactMutation, resetForm, validatePhoneNumber, refetch])

    const handleDelete = useCallback(async () => {
        if (!deletingContact) return

        try {
            await deleteContactMutation.execute(deletingContact.id)
            setDeleteDialogContact(null)
            refetch() // Refresh the contacts list
        } catch (error) {
            // Error handling is done by the hook
        }
    }, [deletingContact, deleteContactMutation, refetch])

    // Check permissions
    const canManage = profile && hasPermission(profile.role, "manage_contacts")

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Skeleton className="h-8 w-32" />
            </div>
        )
    }

    if (profileError) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Error loading profile: {profileError.message}
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            {!groupId && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Contacts</h1>
                        <p className="text-muted-foreground">
                            Manage your WhatsApp contacts and customer information
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={handleAdd}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Contact
                        </Button>
                    )}
                </div>
            )}

            {/* Search and Filter */}
            {!externalSearchTerm && (
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-2 flex-1">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search contacts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                    {showGroupFilters && !groupId && (
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={selectedGroup || "all"} onValueChange={(value) => setSelectedGroup(value === "all" ? null : value)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Groups</SelectItem>
                                    {groups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            )}

            {/* Error Handling */}
            {contactsError && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Error loading contacts: {contactsError.message}
                    </AlertDescription>
                </Alert>
            )}

            {/* Contacts List */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <CardTitle>Contacts ({pagination?.total || filteredContacts.length})</CardTitle>
                            <CardDescription>
                                Manage and organize your contact information
                                {!groupId && selectedGroup && selectedGroup !== "all" && (
                                    <span className="ml-2 text-primary">• Filtered by {selectedGroup}</span>
                                )}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {showCSVActions && canManage && (
                                <ContactsCSVManager
                                    contacts={filteredContacts}
                                    groups={groups}
                                    groupId={groupId}
                                    onRefetch={refetch}
                                    normalizePhoneNumber={normalizePhoneNumber}
                                    validatePhoneNumber={validatePhoneNumber}
                                    allContacts={safeAllContacts || []}
                                />
                            )}
                            {canManage && groupId && (
                                <Button onClick={handleAdd} size="sm">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add Contact
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {contactsLoading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-[250px]" />
                                        <Skeleton className="h-4 w-[200px]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="text-center py-8">
                            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No contacts found</h3>
                            <p className="text-muted-foreground mb-4">
                                {debouncedSearchTerm ? "No contacts match your search." : "Get started by adding your first contact."}
                            </p>
                            {canManage && !debouncedSearchTerm && (
                                <Button onClick={handleAdd}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add First Contact
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredContacts.map((contact) => (
                                <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                            <Users className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium">{contact.name || "Unnamed Contact"}</h4>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-4 w-4" />
                                                {contact.phone_number}
                                                {contact.group_name && (
                                                    <>
                                                        <span>•</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {contact.group_name}
                                                        </Badge>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {canManage && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(contact)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => setDeleteDialogContact(contact)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Contact Dialog */}
            <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {editingContact ? "Edit Contact" : "Add New Contact"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {editingContact ? "Update contact information" : "Add a new contact to your WhatsApp system"}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Contact Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleInputChange("name", e.target.value)}
                                placeholder="Enter contact name"
                                disabled={createContactMutation.loading || updateContactMutation.loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone_number}
                                onChange={(e) => handleInputChange("phone_number", e.target.value)}
                                placeholder="087864457646"
                                disabled={createContactMutation.loading || updateContactMutation.loading}
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter Indonesian phone number (will be automatically formatted to +62)
                            </p>
                        </div>

                        {/* Group Selection with Context Badge */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="group">Contact Group</Label>
                                {/* Current Group Context Badge */}
                                {groupId && groupId !== "all" && (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: groups.find(g => g.id === groupId)?.color || "#3B82F6" }}
                                        />
                                        Current: {groups.find(g => g.id === groupId)?.name || "Unknown Group"}
                                    </Badge>
                                )}
                                {groupId === "all" && (
                                    <Badge variant="secondary" className="text-xs">
                                        📋 All Contacts View
                                    </Badge>
                                )}
                            </div>

                            <Select
                                value={formData.group_id}
                                onValueChange={(value) => handleInputChange("group_id", value)}
                                disabled={createContactMutation.loading || updateContactMutation.loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a group (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Group</SelectItem>
                                    {groups
                                        .filter(group => group.name !== "All Contacts") // Filter out "All Contacts" from selection
                                        .map((group) => (
                                            <SelectItem key={group.id} value={group.id}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: group.color }}
                                                    />
                                                    {group.name}
                                                    {group.id === groupId && (
                                                        <span className="text-xs text-muted-foreground">(Current)</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>

                            {/* Smart Context Messages */}
                            {groupId && groupId !== "all" ? (
                                <div className="text-xs text-muted-foreground">
                                    {formData.group_id === "none" ? (
                                        <>Will be added to <span className="font-medium">{groups.find(g => g.id === groupId)?.name}</span> (current group)</>
                                    ) : formData.group_id === groupId ? (
                                        <>Will remain in <span className="font-medium">{groups.find(g => g.id === groupId)?.name}</span> (current group)</>
                                    ) : (
                                        <>Will be moved to <span className="font-medium">{groups.find(g => g.id === formData.group_id)?.name || "selected group"}</span></>
                                    )}
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    {formData.group_id === "none" ? (
                                        "Contact will not be assigned to any group"
                                    ) : (
                                        <>Will be assigned to <span className="font-medium">{groups.find(g => g.id === formData.group_id)?.name}</span></>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={resetForm} disabled={createContactMutation.loading || updateContactMutation.loading}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={editingContact ? handleUpdate : handleCreate}
                            disabled={createContactMutation.loading || updateContactMutation.loading}
                        >
                            {createContactMutation.loading || updateContactMutation.loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    {editingContact ? "Updating..." : "Creating..."}
                                </>
                            ) : (
                                <>
                                    {editingContact ? "Update Contact" : "Add Contact"}
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingContact} onOpenChange={() => setDeleteDialogContact(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deletingContact?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteContactMutation.loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteContactMutation.loading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteContactMutation.loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}