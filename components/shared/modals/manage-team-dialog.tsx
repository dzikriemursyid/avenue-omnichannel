"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Users, UserPlus, UserMinus, Trash2, Crown, ArrowDown, CheckSquare, Square, X } from "lucide-react";
import {
    useUpdateTeam,
    useAddTeamMember,
    useRemoveTeamMember,
    useDeleteTeam,
    useAvailableUsers,
    useDemoteTeamLeader,
    useBulkAddTeamMembers,
    useBulkRemoveTeamMembers
} from "@/hooks";
import { toast } from "sonner";
import type { Team } from "@/lib/supabase/teams";

interface ManageTeamDialogProps {
    team: Team;
    canDelete: boolean;
    onTeamUpdated?: () => void;
    onTeamDeleted?: () => void;
    onMemberAdded?: () => void;
    onMemberRemoved?: () => void;
    onError?: (error: string) => void;
}

export function ManageTeamDialog({
    team,
    canDelete,
    onTeamUpdated,
    onTeamDeleted,
    onMemberAdded,
    onMemberRemoved,
    onError
}: ManageTeamDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const router = useRouter();

    // API Hooks
    const updateTeamHook = useUpdateTeam();
    const addMemberHook = useAddTeamMember();
    const removeMemberHook = useRemoveTeamMember();
    const deleteTeamHook = useDeleteTeam();
    const demoteLeaderHook = useDemoteTeamLeader();
    const bulkAddMembersHook = useBulkAddTeamMembers();
    const bulkRemoveMembersHook = useBulkRemoveTeamMembers();

    // Available users hook - only fetch when dialog is open
    const [shouldFetchUsers, setShouldFetchUsers] = useState(false);
    const availableUsersHook = useAvailableUsers(shouldFetchUsers ? team.id : null);

    // Loading state - combine all loading states
    const loading = updateTeamHook.loading || addMemberHook.loading || removeMemberHook.loading ||
        deleteTeamHook.loading || demoteLeaderHook.loading || availableUsersHook.loading ||
        bulkAddMembersHook.loading || bulkRemoveMembersHook.loading;

    useEffect(() => {
        if (open) {
            // Only fetch available users when dialog opens
            setShouldFetchUsers(true);
        } else {
            // Reset when dialog closes
            setShouldFetchUsers(false);
            setSelectedUserIds([]);
            setSelectedMemberIds([]);
        }
    }, [open]);

    // Handle bulk user selection
    const handleUserSelection = (userId: string, checked: boolean) => {
        if (checked) {
            setSelectedUserIds(prev => [...prev, userId]);
        } else {
            setSelectedUserIds(prev => prev.filter(id => id !== userId));
        }
    };

    // Handle bulk member selection
    const handleMemberSelection = (memberId: string, checked: boolean) => {
        if (checked) {
            setSelectedMemberIds(prev => [...prev, memberId]);
        } else {
            setSelectedMemberIds(prev => prev.filter(id => id !== memberId));
        }
    };

    // Handle select all available users
    const handleSelectAllUsers = (checked: boolean) => {
        if (checked) {
            const allUserIds = availableUsersHook.users
                .filter(user => !user.team_id || user.team_id !== team.id)
                .map(user => user.id);
            setSelectedUserIds(allUserIds);
        } else {
            setSelectedUserIds([]);
        }
    };

    // Handle select all members
    const handleSelectAllMembers = (checked: boolean) => {
        if (checked) {
            const allMemberIds = team.members?.map(member => member.id) || [];
            setSelectedMemberIds(allMemberIds);
        } else {
            setSelectedMemberIds([]);
        }
    };

    // Handle clear all selected users
    const handleClearSelectedUsers = () => {
        setSelectedUserIds([]);
    };

    // Handle clear all selected members
    const handleClearSelectedMembers = () => {
        setSelectedMemberIds([]);
    };

    async function handleUpdateTeam(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const updateData = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            is_active: formData.get("is_active") === "on",
        };

        try {
            await updateTeamHook.execute(team.id, updateData);

            if (onTeamUpdated) {
                onTeamUpdated();
            } else {
                router.refresh();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to update team";
            if (onError) {
                onError(errorMessage);
            } else {
                toast.error(errorMessage);
            }
        }
    }

    async function handleAddMember() {
        if (!selectedUserId) {
            toast.error("Please select a user to add");
            return;
        }

        try {
            await addMemberHook.execute(team.id, { userId: selectedUserId });

            setSelectedUserId("");
            // Refresh available users after adding member
            if (shouldFetchUsers) {
                availableUsersHook.refetch();
            }
            if (onMemberAdded) {
                onMemberAdded();
            } else {
                router.refresh();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to add team member";
            if (onError) {
                onError(errorMessage);
            } else {
                toast.error(errorMessage);
            }
        }
    }

    async function handleBulkAddMembers() {
        if (selectedUserIds.length === 0) {
            toast.error("Please select users to add");
            return;
        }

        try {
            await bulkAddMembersHook.execute(team.id, selectedUserIds);

            setSelectedUserIds([]);
            // Refresh available users after adding members
            if (shouldFetchUsers) {
                availableUsersHook.refetch();
            }
            if (onMemberAdded) {
                onMemberAdded();
            } else {
                router.refresh();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to add team members";
            if (onError) {
                onError(errorMessage);
            } else {
                toast.error(errorMessage);
            }
        }
    }

    async function handleRemoveMember(userId: string) {
        try {
            await removeMemberHook.execute(team.id, userId);

            // Refresh available users after removing member
            if (shouldFetchUsers) {
                availableUsersHook.refetch();
            }
            if (onMemberRemoved) {
                onMemberRemoved();
            } else {
                router.refresh();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to remove team member";
            if (onError) {
                onError(errorMessage);
            } else {
                toast.error(errorMessage);
            }
        }
    }

    async function handleBulkRemoveMembers() {
        if (selectedMemberIds.length === 0) {
            toast.error("Please select members to remove");
            return;
        }

        try {
            await bulkRemoveMembersHook.execute(team.id, selectedMemberIds);

            setSelectedMemberIds([]);
            // Refresh available users after removing members
            if (shouldFetchUsers) {
                availableUsersHook.refetch();
            }
            if (onMemberRemoved) {
                onMemberRemoved();
            } else {
                router.refresh();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to remove team members";
            if (onError) {
                onError(errorMessage);
            } else {
                toast.error(errorMessage);
            }
        }
    }

    async function handleMakeLeader(userId: string) {
        try {
            await updateTeamHook.execute(team.id, { leader_id: userId });

            if (onTeamUpdated) {
                onTeamUpdated();
            } else {
                router.refresh();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to update team leader";
            if (onError) {
                onError(errorMessage);
            } else {
                toast.error(errorMessage);
            }
        }
    }

    async function handleDeleteTeam() {
        try {
            await deleteTeamHook.execute(team.id);

            setOpen(false);
            if (onTeamDeleted) {
                onTeamDeleted();
            } else {
                router.refresh();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to delete team";
            if (onError) {
                onError(errorMessage);
            } else {
                toast.error(errorMessage);
            }
        }
    }

    async function handleDemoteLeader(userId: string) {
        try {
            await demoteLeaderHook.execute(team.id, userId);

            if (onTeamUpdated) {
                onTeamUpdated();
            } else {
                router.refresh();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to demote team leader";
            if (onError) {
                onError(errorMessage);
            } else {
                toast.error(errorMessage);
            }
        }
    }

    // Get available users (not in this team)
    const availableUsers = availableUsersHook.users.filter(user => !user.team_id || user.team_id !== team.id);
    const allAvailableUserIds = availableUsers.map(user => user.id);
    const allMemberIds = team.members?.map(member => member.id) || [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                    Manage Team
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Manage Team: {team.name}</DialogTitle>
                    <DialogDescription>Edit team details, manage members, or delete the team.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">
                            <Settings className="h-4 w-4 mr-2" />
                            Details
                        </TabsTrigger>
                        <TabsTrigger value="members">
                            <Users className="h-4 w-4 mr-2" />
                            Members
                        </TabsTrigger>
                        <TabsTrigger value="danger">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Danger
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4">
                        <form onSubmit={handleUpdateTeam}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Team Name</Label>
                                    <Input id="name" name="name" defaultValue={team.name} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        defaultValue={team.description || ""}
                                        rows={3}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="is_active">Active Status</Label>
                                    <Switch id="is_active" name="is_active" defaultChecked={team.is_active} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Updating..." : "Update Team"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>

                    <TabsContent value="members" className="space-y-4">
                        <div className="space-y-6">
                            {/* Add Member Section */}
                            <div className="space-y-4">
                                <Label>Add New Members</Label>

                                {/* Single Add Member */}
                                <div className="flex gap-2">
                                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a user to add" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableUsers.map(user => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.full_name} ({user.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAddMember} disabled={loading || !selectedUserId}>
                                        <UserPlus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Current Members */}
                            <div className="space-y-4">
                                <Label>Current Members</Label>

                                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                                    <div className="flex flex-wrap gap-2">
                                        {team.members && team.members.length > 0 ? team.members.map((member) => (
                                            <Badge
                                                key={member.id}
                                                variant="secondary"
                                                className="flex items-center gap-1"
                                            >
                                                <Avatar className="h-3 w-3">
                                                    <AvatarFallback className="text-xs">
                                                        {member.full_name?.split(" ").map(n => n[0]).join("")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {member.full_name}
                                                {team.leader?.id === member.id && (
                                                    <Crown className="h-3 w-3 text-yellow-500" />
                                                )}
                                                {team.leader?.id !== member.id && (
                                                    <X
                                                        className="h-3 w-3 cursor-pointer"
                                                        onClick={() => handleRemoveMember(member.id)}
                                                    />
                                                )}
                                            </Badge>
                                        )) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No members in this team
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Individual Member Actions */}
                                {team.members && team.members.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Member Actions</Label>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                            {team.members.map((member) => (
                                                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-xs">
                                                                {member.full_name?.split(" ").map(n => n[0]).join("")}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-medium">{member.full_name}</p>
                                                            <p className="text-xs text-muted-foreground">{member.email}</p>
                                                        </div>
                                                        {team.leader?.id === member.id && (
                                                            <Badge variant="secondary" className="ml-2">
                                                                <Crown className="h-3 w-3 mr-1 text-yellow-500" />
                                                                Team Leader
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className="text-xs">{member.role}</Badge>
                                                        {team.leader?.id !== member.id && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleMakeLeader(member.id)}
                                                                    disabled={loading}
                                                                    title="Make Leader"
                                                                >
                                                                    <Crown className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleRemoveMember(member.id)}
                                                                    disabled={loading}
                                                                    title="Remove Member"
                                                                >
                                                                    <UserMinus className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {team.leader?.id === member.id && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDemoteLeader(member.id)}
                                                                disabled={loading}
                                                                title="Demote to Member"
                                                            >
                                                                <ArrowDown className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="danger" className="space-y-4">
                        <div className="space-y-4 py-4">
                            <div className="rounded-lg border border-destructive/50 p-4">
                                <h4 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Once you delete a team, there is no going back. All team members will be unassigned.
                                </p>
                                {canDelete ? (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" disabled={loading}>
                                                Delete Team
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the team
                                                    "{team.name}" and remove all member associations.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground">
                                                    Delete Team
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Only administrators and general managers can delete teams.
                                    </p>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}