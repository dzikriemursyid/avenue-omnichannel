"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSetupProfile } from "@/hooks"
import type { User } from "@supabase/supabase-js"

interface SetupProfileFormProps {
    user: User
}

export function SetupProfileForm({ user }: SetupProfileFormProps) {
    const [formData, setFormData] = useState({
        name: user.user_metadata?.full_name || "",
        username: user.email?.split("@")[0] || "",
        role: "agent" as const,
        team_id: "",
    })

    // Using the new useSetupProfile hook
    const { execute: setupProfile, loading: isPending } = useSetupProfile()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            await setupProfile(formData)
        } catch (error) {
            // Error is handled by the hook
        }
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Complete Your Profile</CardTitle>
                <CardDescription>
                    Please provide some basic information to get started
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={user.email || ""}
                            disabled
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            name="name"
                            required
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            name="username"
                            required
                            placeholder="Choose a username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(value) => setFormData({ ...formData, role: value as any })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="agent">Agent</SelectItem>
                                <SelectItem value="leader">Team Leader</SelectItem>
                                <SelectItem value="general_manager">General Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? "Setting up..." : "Complete Setup"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
