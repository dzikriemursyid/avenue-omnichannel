"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Users, FolderOpen } from "lucide-react"
import { toast } from "sonner"

interface ContactGroup {
    id: string
    name: string
    contactCount: number
}

interface ContactGroupSelectorProps {
    value?: { group_id: string; group_name: string } | null
    onChange: (value: { group_id: string; group_name: string } | null) => void
    disabled?: boolean
}

// Predefined groups for demonstration
const PREDEFINED_GROUPS: ContactGroup[] = [
    { id: "customers", name: "Customers", contactCount: 0 },
    { id: "leads", name: "Leads", contactCount: 0 },
    { id: "partners", name: "Partners", contactCount: 0 },
    { id: "vendors", name: "Vendors", contactCount: 0 },
    { id: "employees", name: "Employees", contactCount: 0 },
    { id: "family", name: "Family", contactCount: 0 },
    { id: "friends", name: "Friends", contactCount: 0 },
]

export function ContactGroupSelector({ value, onChange, disabled = false }: ContactGroupSelectorProps) {
    const [groups, setGroups] = useState<ContactGroup[]>(PREDEFINED_GROUPS)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null)
    const [deletingGroup, setDeletingGroup] = useState<ContactGroup | null>(null)
    const [newGroupName, setNewGroupName] = useState("")

    const handleGroupSelect = (groupId: string) => {
        const selectedGroup = groups.find(g => g.id === groupId)
        if (selectedGroup) {
            onChange({ group_id: selectedGroup.id, group_name: selectedGroup.name })
        } else {
            onChange(null)
        }
    }

    const handleCreateGroup = () => {
        if (!newGroupName.trim()) {
            toast.error("Please enter a group name")
            return
        }

        const groupId = newGroupName.toLowerCase().replace(/\s+/g, '_')
        const existingGroup = groups.find(g => g.id === groupId)

        if (existingGroup) {
            toast.error("A group with this name already exists")
            return
        }

        const newGroup: ContactGroup = {
            id: groupId,
            name: newGroupName.trim(),
            contactCount: 0
        }

        setGroups(prev => [...prev, newGroup])
        setNewGroupName("")
        setShowCreateDialog(false)
        toast.success("Group created successfully!")
    }

    const handleEditGroup = () => {
        if (!editingGroup || !newGroupName.trim()) {
            toast.error("Please enter a group name")
            return
        }

        const updatedGroups = groups.map(g =>
            g.id === editingGroup.id
                ? { ...g, name: newGroupName.trim() }
                : g
        )

        setGroups(updatedGroups)

        // Update the current value if it's the edited group
        if (value?.group_id === editingGroup.id) {
            onChange({ group_id: editingGroup.id, group_name: newGroupName.trim() })
        }

        setNewGroupName("")
        setEditingGroup(null)
        toast.success("Group updated successfully!")
    }

    const handleDeleteGroup = () => {
        if (!deletingGroup) return

        const updatedGroups = groups.filter(g => g.id !== deletingGroup.id)
        setGroups(updatedGroups)

        // Clear the current value if it's the deleted group
        if (value?.group_id === deletingGroup.id) {
            onChange(null)
        }

        setDeletingGroup(null)
        toast.success("Group deleted successfully!")
    }

    const handleEditClick = (group: ContactGroup) => {
        setEditingGroup(group)
        setNewGroupName(group.name)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Contact Group</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateDialog(true)}
                    disabled={disabled}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groups.map((group) => (
                    <Card
                        key={group.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${value?.group_id === group.id
                            ? 'ring-2 ring-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                            }`}
                        onClick={() => !disabled && handleGroupSelect(group.id)}
                    >
                        <CardHeader className="p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-sm font-medium">{group.name}</CardTitle>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{group.contactCount}</span>
                                </div>
                            </div>
                        </CardHeader>
                        {!disabled && (
                            <CardContent className="p-3 pt-0">
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleEditClick(group)
                                        }}
                                        className="h-6 px-2"
                                    >
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setDeletingGroup(group)
                                        }}
                                        className="h-6 px-2 text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>

            {value && (
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {value.group_name}
                    </Badge>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onChange(null)}
                        disabled={disabled}
                    >
                        Clear
                    </Button>
                </div>
            )}

            {/* Create Group Dialog */}
            <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create New Group</AlertDialogTitle>
                        <AlertDialogDescription>
                            Create a new group to organize your contacts
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="group-name">Group Name</Label>
                            <Input
                                id="group-name"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="Enter group name"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleCreateGroup()
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setNewGroupName("")}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCreateGroup}>Create Group</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Group Dialog */}
            <AlertDialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Edit Group</AlertDialogTitle>
                        <AlertDialogDescription>
                            Update the group name
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-group-name">Group Name</Label>
                            <Input
                                id="edit-group-name"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="Enter group name"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleEditGroup()
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setNewGroupName("")}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEditGroup}>Update Group</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Group Dialog */}
            <AlertDialog open={!!deletingGroup} onOpenChange={() => setDeletingGroup(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deletingGroup?.name}"? This will remove the group from all contacts.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteGroup}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Group
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
} 