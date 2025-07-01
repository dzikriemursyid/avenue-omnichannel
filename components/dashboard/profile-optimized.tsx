"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, Save, AlertCircle } from "lucide-react"
import { useProfile, useUpdateProfile, useDebounce, useDebouncedCallback } from "@/hooks"

export function ProfileOptimized() {
    const { profile, loading: profileLoading, error: profileError } = useProfile()
    const updateProfile = useUpdateProfile()

    // Local form state
    const [formData, setFormData] = useState({
        full_name: "",
        phone_number: "",
        avatar_url: ""
    })

    // Track if form has changes
    const [hasChanges, setHasChanges] = useState(false)

    // Initialize form when profile loads
    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || "",
                phone_number: profile.phone_number || "",
                avatar_url: profile.avatar_url || ""
            })
        }
    }, [profile])

    // Debounced save function
    const debouncedSave = useDebouncedCallback(
        async (data: typeof formData) => {
            await updateProfile.execute(data)
            setHasChanges(false)
        },
        1000 // Auto-save after 1 second of no changes
    )

    // Handle input changes
    const handleChange = (field: keyof typeof formData, value: string) => {
        const newData = { ...formData, [field]: value }
        setFormData(newData)
        setHasChanges(true)

        // Auto-save with debounce
        debouncedSave(newData)
    }

    // Manual save
    const handleSave = async () => {
        await updateProfile.execute(formData)
        setHasChanges(false)
    }

    // Loading skeleton
    if (profileLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Error state
    if (profileError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load profile: {profileError.message}
                </AlertDescription>
            </Alert>
        )
    }

    if (!profile) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                    Update your personal information • Changes save automatically
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Avatar Section with lazy loading */}
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage
                            src={formData.avatar_url}
                            alt={formData.full_name}
                            loading="lazy" // Native lazy loading
                        />
                        <AvatarFallback>
                            {formData.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <Button variant="outline" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Change Photo
                    </Button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            value={profile.email}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => handleChange('full_name', e.target.value)}
                            placeholder="Enter your full name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone_number">Phone Number</Label>
                        <Input
                            id="phone_number"
                            type="tel"
                            value={formData.phone_number}
                            onChange={(e) => handleChange('phone_number', e.target.value)}
                            placeholder="+62 xxx xxxx xxxx"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Role</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1).replace('_', ' ')}
                                disabled
                                className="bg-muted"
                            />
                            {profile.team_id && (
                                <span className="text-sm text-muted-foreground">
                                    Team member
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Save indicator */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {updateProfile.loading ? (
                            <span className="flex items-center gap-2">
                                <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </span>
                        ) : hasChanges ? (
                            <span>Unsaved changes</span>
                        ) : (
                            <span className="text-green-600">All changes saved</span>
                        )}
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || updateProfile.loading}
                        size="sm"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                </div>

                {/* Success/Error Messages */}
                {updateProfile.error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {updateProfile.error.message}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    )
} 