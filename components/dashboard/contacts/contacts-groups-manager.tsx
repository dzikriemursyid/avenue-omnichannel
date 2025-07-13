"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Edit, Trash2, ArrowRight, Search, UserPlus, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContactGroups } from "@/hooks/use-contact-groups";
import { useContactGroupContacts } from "@/hooks/use-contact-groups";
import { contactGroupsApi } from "@/lib/api/contact-groups";
import { contactsApi } from "@/lib/api/contacts";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const GROUP_COLORS = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#6B7280", // Gray
];

const GROUP_ICONS = [
    "Users", "Target", "ShoppingBag", "Handshake", "Truck", "Briefcase", "Heart", "Star"
];

export function ContactGroupsManager() {
    const { groups, loading, error, refresh } = useContactGroups();
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [deletingGroup, setDeletingGroup] = useState<any>(null);
    const [createForm, setCreateForm] = useState({
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "Users",
    });
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "Users",
    });

    const router = useRouter();
    const { execute: createGroup, loading: creating } = useApi(contactGroupsApi.create);
    const { execute: updateGroup, loading: updating } = useApi(contactGroupsApi.update);
    const { execute: deleteGroup, loading: deleting } = useApi(contactGroupsApi.delete);

    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createGroup(createForm);
            toast.success("Group created successfully");
            setShowCreateDialog(false);
            setCreateForm({
                name: "",
                description: "",
                color: "#3B82F6",
                icon: "Users",
            });
            refresh();
        } catch (error) {
            toast.error("Failed to create group");
        }
    };

    const handleEditGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGroup) return;
        try {
            await updateGroup(editingGroup.id, editForm);
            toast.success("Group updated successfully");
            setShowEditDialog(false);
            setEditingGroup(null);
            refresh();
        } catch (error) {
            toast.error("Failed to update group");
        }
    };

    const handleDeleteGroup = async (groupId: string, groupName: string) => {
        setDeletingGroup({ id: groupId, name: groupName });
        setShowDeleteDialog(true);
    };

    const confirmDeleteGroup = async () => {
        if (!deletingGroup) return;

        try {
            await deleteGroup(deletingGroup.id);
            toast.success("Group deleted successfully");
            setShowDeleteDialog(false);
            setDeletingGroup(null);
            refresh();
        } catch (error) {
            toast.error("Failed to delete group");
        }
    };

    const openEditDialog = (group: any) => {
        setEditingGroup(group);
        setEditForm({
            name: group.name,
            description: group.description || "",
            color: group.color,
            icon: group.icon,
        });
        setShowEditDialog(true);
    };

    const handleGroupClick = (group: any) => {
        if (group.name === "All Contacts") {
            router.push("/dashboard/contacts/all");
        } else {
            router.push(`/dashboard/contacts/groups/${group.id}`);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert>
                <AlertDescription>
                    Error loading contact groups: {error.message}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Contact Groups</h2>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                            <Plus size={16} />
                            Create Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Group</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Group Name</Label>
                                <Input
                                    id="name"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    placeholder="Enter group name"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    placeholder="Enter group description"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="color">Color</Label>
                                    <Select value={createForm.color} onValueChange={(value) => setCreateForm({ ...createForm, color: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GROUP_COLORS.map((color) => (
                                                <SelectItem key={color} value={color}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                                                        {color}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="icon">Icon</Label>
                                    <Select value={createForm.icon} onValueChange={(value) => setCreateForm({ ...createForm, icon: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GROUP_ICONS.map((icon) => (
                                                <SelectItem key={icon} value={icon}>
                                                    {icon}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={creating}>
                                    {creating ? "Creating..." : "Create Group"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
                <Search size={16} className="text-gray-400" />
                <Input
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGroups.map((group) => (
                    <Card
                        key={group.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                        onClick={() => handleGroupClick(group)}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                        style={{ backgroundColor: group.color }}
                                    >
                                        {group.icon === "Users" ? <Users size={16} /> : group.icon}
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{group.name}</CardTitle>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEditDialog(group);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Edit size={14} />
                                    </Button>
                                    {group.name !== "All Contacts" && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteGroup(group.id, group.name);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {group.description && (
                                    <p className="text-sm text-gray-600">{group.description}</p>
                                )}
                                <div className="flex items-center justify-between">
                                    <Badge variant="secondary" className="text-xs">
                                        {group.contact_count || 0} contacts
                                    </Badge>
                                    <ArrowRight size={16} className="text-gray-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Group Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Group</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditGroup} className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name">Group Name</Label>
                            <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder="Enter group name"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="Enter group description"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-color">Color</Label>
                                <Select value={editForm.color} onValueChange={(value) => setEditForm({ ...editForm, color: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GROUP_COLORS.map((color) => (
                                            <SelectItem key={color} value={color}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                                                    {color}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="edit-icon">Icon</Label>
                                <Select value={editForm.icon} onValueChange={(value) => setEditForm({ ...editForm, icon: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GROUP_ICONS.map((icon) => (
                                            <SelectItem key={icon} value={icon}>
                                                {icon}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updating}>
                                {updating ? "Updating..." : "Update Group"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>Are you sure you want to delete "{deletingGroup?.name}"?</p>
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                This action cannot be undone. All contacts in this group will be moved to "All Contacts".
                            </AlertDescription>
                        </Alert>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDeleteGroup}
                            disabled={deleting}
                        >
                            {deleting ? "Deleting..." : "Delete Group"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 