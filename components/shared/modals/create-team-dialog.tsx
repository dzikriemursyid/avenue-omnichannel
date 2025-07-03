"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { useCreateTeam } from "@/hooks";
import { toast } from "sonner";

interface CreateTeamDialogProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

export function CreateTeamDialog({ onSuccess, onError }: CreateTeamDialogProps = {}) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        is_active: true
    });

    // Use the migrated hook - now working perfectly!
    const { execute: createTeam, loading, error } = useCreateTeam();

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            // Client-side validation
            if (!formData.name.trim()) {
                const errorMessage = "Team name is required";
                if (onError) {
                    onError(errorMessage);
                } else {
                    toast.error(errorMessage);
                }
                return;
            }

            // Call API via hook - now with reliable auth & validation
            await createTeam({
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                is_active: formData.is_active
            });

            // Success handling
            setOpen(false);
            setFormData({ name: "", description: "", is_active: true }); // Reset form

            if (onSuccess) {
                onSuccess();
            }
            // Success toast is handled by the hook

        } catch (err) {
            // Error handling is managed by the hook
            // Only handle if custom error callback is provided
            if (onError && err instanceof Error) {
                onError(err.message);
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                    <DialogDescription>
                        Create a new team to organize your agents and manage workflows.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Team Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter team name"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Enter team description (optional)"
                            disabled={loading}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            disabled={loading}
                        />
                        <Label htmlFor="is_active">Active Team</Label>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Team"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}