"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    User,
    Mail,
    Shield,
    Calendar,
    Building2,
    Edit,
    Upload,
    Trash2,
    X,
    Phone,
    CheckCircle,
    Clock,
    Key,
    Save,
    Camera,
    Settings,
    UserCheck,
    AlertCircle,
} from "lucide-react"
import { useProfile, useUpdateProfile } from "@/hooks"
import { uploadProfileAvatar, deleteProfileAvatar } from "@/lib/actions/profile"
import { toast } from "sonner"

const roleColors = {
    admin: "bg-gradient-to-r from-red-500 to-red-600 text-white",
    general_manager: "bg-gradient-to-r from-purple-500 to-purple-600 text-white",
    leader: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
    agent: "bg-gradient-to-r from-green-500 to-green-600 text-white",
}

const roleLabels = {
    admin: "Administrator",
    general_manager: "General Manager",
    leader: "Team Leader",
    agent: "Agent",
}

export function ProfileOptimized() {
    const { profile, loading: profileLoading, error: profileError, refetch } = useProfile()
    const updateProfile = useUpdateProfile()

    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        full_name: "",
        phone_number: "",
    })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [avatarUploading, setAvatarUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Initialize form when profile loads
    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || "",
                phone_number: profile.phone_number || "",
            })
            setPreviewUrl(profile.avatar_url)
        }
    }, [profile])

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            // Check file size (2MB limit)
            if (file.size > 2 * 1024 * 1024) {
                toast.error("File size must be less than 2MB")
                return
            }

            // Check file type
            if (!file.type.startsWith("image/")) {
                toast.error("File must be an image")
                return
            }

            setSelectedFile(file)

            // Create preview URL
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
        }
    }

    const handleSave = async () => {
        try {
            // Update basic profile info first
            await updateProfile.execute(formData)

            // Upload avatar if selected
            if (selectedFile) {
                setAvatarUploading(true)
                const avatarFormData = new FormData()
                avatarFormData.append("avatar", selectedFile)

                const avatarResult = await uploadProfileAvatar(avatarFormData)

                if (avatarResult.success) {
                    toast.success("Avatar uploaded successfully!")

                    // Clear the selected file and file input
                    setSelectedFile(null)
                    if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                    }
                } else {
                    toast.error(avatarResult.message)
                    setAvatarUploading(false)
                    return
                }
                setAvatarUploading(false)
            }

            setIsEditing(false)

            // Refresh profile data to get updated avatar URL
            await refetch()

            // Small delay to ensure UI reflects the changes
            setTimeout(() => {
                if (profile) {
                    setPreviewUrl(profile.avatar_url)
                }
            }, 500)

        } catch (error) {
            console.error("Failed to save profile:", error)
            setAvatarUploading(false)
        }
    }

    const handleCancel = () => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || "",
                phone_number: profile.phone_number || "",
            })
        }
        setSelectedFile(null)
        setPreviewUrl(profile?.avatar_url || null)
        setIsEditing(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleDeleteAvatar = async () => {
        if (!profile?.avatar_url) {
            toast.error("No avatar to delete")
            return
        }

        setAvatarUploading(true)
        try {
            const result = await deleteProfileAvatar()
            if (result.success) {
                toast.success(result.message)
                setPreviewUrl(null)

                // Refresh profile data
                await refetch()
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error("An error occurred while deleting avatar")
        } finally {
            setAvatarUploading(false)
        }
    }

    const isLoading = updateProfile.loading || avatarUploading

    // Loading skeleton
    if (profileLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-8 w-64" />
                                <Skeleton className="h-4 w-80 mt-2" />
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <Skeleton className="h-28 w-28 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-48" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="xl:col-span-1">
                        <div className="space-y-6">
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-80 w-full" />
                        </div>
                    </div>
                </div>
            </div>
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

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div>
                    <h2 className="text-2xl font-bold">My Profile</h2>
                    <p className="text-muted-foreground">View and manage your profile information.</p>
                </div>
                {!isEditing && (
                    <Button
                        onClick={() => setIsEditing(true)}
                        size="lg"
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Profile Card - Takes full width on mobile, 2 columns on desktop */}
                <div className="xl:col-span-2">
                    <Card className="shadow-lg border-0 bg-white">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                            <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <User className="h-5 w-5 text-blue-600" />
                                </div>
                                Personal Information
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Your profile details and contact information
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-6">
                            {/* Avatar Section */}
                            <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-8">
                                <div className="flex flex-col items-center sm:items-start">
                                    <div className="relative group">
                                        <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-blue-100 shadow-lg">
                                            <AvatarImage
                                                src={previewUrl || undefined}
                                                alt={profile.full_name}
                                                key={previewUrl} // Force re-render when previewUrl changes
                                            />
                                            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                                {profile.full_name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {isEditing && (
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full shadow-lg bg-white border-2 border-blue-200 hover:bg-blue-50"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isLoading}
                                            >
                                                <Camera className="h-4 w-4 text-blue-600" />
                                            </Button>
                                        )}

                                        {/* Loading overlay for avatar */}
                                        {avatarUploading && (
                                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {isEditing && (
                                        <div className="mt-4 text-center sm:text-left">
                                            <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isLoading}
                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                >
                                                    <Upload className="h-3 w-3 mr-2" />
                                                    Upload Photo
                                                </Button>
                                                {(profile.avatar_url || selectedFile) && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleDeleteAvatar}
                                                        disabled={isLoading}
                                                        className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                                                    >
                                                        <Trash2 className="h-3 w-3 mr-2" />
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">Max 2MB • JPG, PNG, GIF</p>
                                            {selectedFile && (
                                                <p className="text-xs text-blue-600 mt-1">
                                                    Selected: {selectedFile.name}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-1 text-center sm:text-left">
                                    <h2 className="text-2xl font-bold text-gray-900">{profile.full_name}</h2>
                                    <p className="text-gray-600">{profile.email}</p>
                                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                                        <Badge className={`${roleColors[profile.role]} px-3 py-1 text-sm font-medium shadow-sm`}>
                                            <Shield className="h-3 w-3 mr-1" />
                                            {roleLabels[profile.role]}
                                        </Badge>
                                        <Badge variant={profile.is_active ? "default" : "secondary"} className="px-3 py-1 shadow-sm">
                                            <UserCheck className="h-3 w-3 mr-1" />
                                            {profile.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-6" />

                            {/* Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label htmlFor="full_name" className="text-sm font-semibold text-gray-700">
                                        Full Name
                                    </Label>
                                    {isEditing ? (
                                        <Input
                                            id="full_name"
                                            value={formData.full_name}
                                            onChange={(e) => handleInputChange("full_name", e.target.value)}
                                            disabled={isLoading}
                                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                            <User className="h-4 w-4 text-gray-500" />
                                            <span className="font-medium text-gray-900">{profile.full_name}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold text-gray-700">Email Address</Label>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <Mail className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-700">{profile.email}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="phone_number" className="text-sm font-semibold text-gray-700">
                                        Phone Number
                                    </Label>
                                    {isEditing ? (
                                        <Input
                                            id="phone_number"
                                            value={formData.phone_number}
                                            onChange={(e) => handleInputChange("phone_number", e.target.value)}
                                            placeholder="Enter phone number"
                                            disabled={isLoading}
                                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                            <Phone className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-700">{profile.phone_number || "Not provided"}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold text-gray-700">Team Assignment</Label>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <Building2 className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-700">{profile.team_id ? "Team Member" : "No team assigned"}</span>
                                    </div>
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                        disabled={isLoading}
                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isLoading}
                                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        {isLoading ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            )}

                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        </CardContent>
                    </Card>
                </div>

                {/* Account Details Sidebar */}
                <div className="xl:col-span-1">
                    <div className="space-y-6">
                        {/* Account Info Card */}
                        <Card className="shadow-lg border-0 bg-white">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                                <CardTitle className="flex items-center gap-3 text-lg text-gray-900">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Calendar className="h-4 w-4 text-green-600" />
                                    </div>
                                    Account Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">Member Since</span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900">
                                            {new Date(profile.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">Last Updated</span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900">
                                            {new Date(profile.updated_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                        <div className="flex items-center gap-2">
                                            <Key className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">User ID</span>
                                        </div>
                                        <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded text-gray-700">
                                            {profile.id.slice(0, 8)}...
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Permissions Card */}
                        <Card className="shadow-lg border-0 bg-white">
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-lg">
                                <CardTitle className="flex items-center gap-3 text-lg text-gray-900">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Settings className="h-4 w-4 text-purple-600" />
                                    </div>
                                    Permissions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-100">
                                        <span className="text-sm text-gray-700">Dashboard Access</span>
                                        <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Active
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-100">
                                        <span className="text-sm text-gray-700">Contact Management</span>
                                        <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Active
                                        </Badge>
                                    </div>

                                    {(profile.role === "admin" || profile.role === "general_manager" || profile.role === "leader") && (
                                        <>
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-100">
                                                <span className="text-sm text-gray-700">Campaign Management</span>
                                                <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Active
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-100">
                                                <span className="text-sm text-gray-700">Analytics Access</span>
                                                <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Active
                                                </Badge>
                                            </div>
                                        </>
                                    )}

                                    {profile.role === "admin" && (
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-100">
                                            <span className="text-sm text-gray-700">User Management</span>
                                            <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Active
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
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
        </div>
    )
} 