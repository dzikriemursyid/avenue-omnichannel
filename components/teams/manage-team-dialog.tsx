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
import { Settings, Users, UserPlus, UserMinus, Trash2, Crown } from "lucide-react";
import { updateTeam, addTeamMember, removeTeamMember, deleteTeam, getAvailableUsersForTeam } from "@/lib/actions/team-management";
import { toast } from "sonner";
import type { Team } from "@/lib/supabase/teams";

interface ManageTeamDialogProps {
    team: Team;
    canDelete: boolean;
}

export function ManageTeamDialog({ team, canDelete }: ManageTeamDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (open) {
            loadAvailableUsers();
        }
    }, [open]);

    async function loadAvailableUsers() {
        const result = await getAvailableUsersForTeam(team.id);
        if (!result.error) {
            setAvailableUsers(result.users);
        }
    }

    async function handleUpdateTeam(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        const result = await updateTeam({
            teamId: team.id,
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            is_active: formData.get("is_active") === "on",
        });

        if (result.error) {
            toast.error(typeof result.error === "string" ? result.error : "Failed to update team");
        } else {
            toast.success("Team updated successfully");
            router.refresh();
        }

        setLoading(false);
    }

    async function handleAddMember() {
        if (!selectedUserId) {
            toast.error("Please select a user to add");
            return;
        }

        setLoading(true);
        const result = await addTeamMember({
            teamId: team.id,
            userId: selectedUserId,
        });

        if (result.error) {
            toast.error(typeof result.error === "string" ? result.error : "Failed to add team member");
        } else {
            toast.success("Member added successfully");
            setSelectedUserId("");
            loadAvailableUsers();
            router.refresh();
        }

        setLoading(false);
    }

    async function handleRemoveMember(userId: string) {
        setLoading(true);
        const result = await removeTeamMember({
            teamId: team.id,
            userId,
        });

        if (result.error) {
            toast.error(typeof result.error === "string" ? result.error : "Failed to remove team member");
        } else {
            toast.success("Member removed successfully");
            loadAvailableUsers();
            router.refresh();
        }

        setLoading(false);
    }

    async function handleMakeLeader(userId: string) {
        setLoading(true);
        const result = await updateTeam({
            teamId: team.id,
            leader_id: userId,
        });

        if (result.error) {
            toast.error(typeof result.error === "string" ? result.error : "Failed to update team leader");
        } else {
            toast.success("Team leader updated successfully");
            router.refresh();
        }

        setLoading(false);
    }

    async function handleDeleteTeam() {
        setLoading(true);
        const result = await deleteTeam({
            teamId: team.id,
        });

        if (result.error) {
            toast.error(typeof result.error === "string" ? result.error : "Failed to delete team");
        } else {
            toast.success("Team deleted successfully");
            setOpen(false);
            router.refresh();
        }

        setLoading(false);
    }

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
                        <div className="space-y-4">
                            {/* Add Member Section */}
                            <div className="space-y-2">
                                <Label>Add New Member</Label>
                                <div className="flex gap-2">
                                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a user to add" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableUsers
                                                .filter(user => !user.team_id || user.team_id !== team.id)
                                                .map(user => (
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
                            <div className="space-y-2">
                                <Label>Current Members</Label>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {team.members.map((member) => (
                                        <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>
                                                        {member.full_name.split(" ").map(n => n[0]).join("")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium">{member.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                                </div>
                                                {team.leader?.id === member.id && (
                                                    <Crown className="h-4 w-4 text-yellow-500" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{member.role}</Badge>
                                                {team.leader?.id !== member.id && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleMakeLeader(member.id)}
                                                            disabled={loading}
                                                        >
                                                            <Crown className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            disabled={loading}
                                                        >
                                                            <UserMinus className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
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