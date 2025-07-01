"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { completeProfileSetup } from "@/lib/actions/auth"
import type { User } from "@supabase/supabase-js"

interface SetupProfileFormProps {
    user: User
}

export function SetupProfileForm({ user }: SetupProfileFormProps) {
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            const result = await completeProfileSetup(formData)

            if (result.success) {
                toast({
                    title: "Profile Setup Complete",
                    description: "Welcome to the platform!",
                })
                // Redirect will be handled by the action
            } else {
                toast({
                    title: "Error",
                    description: result.message,
                    variant: "destructive",
                })
            }
        })
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
                <form action={handleSubmit} className="space-y-4">
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
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                            id="full_name"
                            name="full_name"
                            required
                            placeholder="Enter your full name"
                            defaultValue={user.user_metadata?.full_name || ""}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number (Optional)</Label>
                        <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="+62 xxx xxxx xxxx"
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? "Setting up..." : "Complete Setup"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
