"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
} from "lucide-react"
import type { UserProfile } from "@/lib/supabase/profiles"
import { useState, useRef } from "react"
import { updateProfile, uploadProfileAvatar, deleteProfileAvatar } from "@/lib/actions/profile"
import { toast } from "sonner"

interface UserProfileViewProps {
  profile: UserProfile
}

const roleColors = {
  admin: "bg-red-500 hover:bg-red-600",
  general_manager: "bg-purple-500 hover:bg-purple-600",
  leader: "bg-blue-500 hover:bg-blue-600",
  agent: "bg-green-500 hover:bg-green-600",
}

const roleLabels = {
  admin: "Administrator",
  general_manager: "General Manager",
  leader: "Team Leader",
  agent: "Agent",
}

export function UserProfileView({ profile }: UserProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile.full_name,
    phone_number: profile.phone_number || "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile.avatar_url)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setIsLoading(true)

    try {
      // Update profile data
      const formDataObj = new FormData()
      formDataObj.append("full_name", formData.full_name)
      if (formData.phone_number) {
        formDataObj.append("phone_number", formData.phone_number)
      }

      const result = await updateProfile(formDataObj)

      if (result.success) {
        // Upload avatar if selected
        if (selectedFile) {
          const avatarFormData = new FormData()
          avatarFormData.append("avatar", selectedFile)

          const avatarResult = await uploadProfileAvatar(avatarFormData)
          if (!avatarResult.success) {
            toast.error(avatarResult.message)
            setIsLoading(false)
            return
          }
        }

        toast.success(result.message)
        setIsEditing(false)
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("An error occurred while updating profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      full_name: profile.full_name,
      phone_number: profile.phone_number || "",
    })
    setSelectedFile(null)
    setPreviewUrl(profile.avatar_url)
    setIsEditing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDeleteAvatar = async () => {
    if (!profile.avatar_url) return

    setIsLoading(true)
    try {
      const result = await deleteProfileAvatar()
      if (result.success) {
        toast.success(result.message)
        setPreviewUrl(null)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("An error occurred while deleting avatar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      {/* Profile Header */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage your account information and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Information Card */}
        <Card className="w-full">
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-sm">Your personal details and account information</CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                  <AvatarImage src={previewUrl || undefined} alt={profile.full_name} />
                  <AvatarFallback className="text-lg sm:text-xl font-semibold">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Upload className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {isEditing && (
                <div className="flex flex-col items-center space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    {profile.avatar_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteAvatar}
                        disabled={isLoading}
                        className="text-destructive hover:text-destructive bg-transparent"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground text-center">Max 2MB • JPG, PNG, GIF</p>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium">
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange("full_name", e.target.value)}
                    disabled={isLoading}
                    className="w-full"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{profile.full_name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Email Address</Label>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{profile.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-sm font-medium">
                  Phone Number
                </Label>
                {isEditing ? (
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange("phone_number", e.target.value)}
                    placeholder="Enter phone number"
                    disabled={isLoading}
                    className="w-full"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.phone_number || "Not provided"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Role</Label>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Badge className={`${roleColors[profile.role]} text-white`}>{roleLabels[profile.role]}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Team</Label>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.team_id ? "Team Member" : "No team assigned"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Account Status</Label>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <Badge variant={profile.is_active ? "default" : "secondary"}>
                    {profile.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {isEditing && (
              <>
                <Separator />
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="w-full sm:w-auto bg-transparent"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Calendar className="h-5 w-5" />
              Account Details
            </CardTitle>
            <CardDescription className="text-sm">Account creation and activity information</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Member Since</span>
                </div>
                <span className="text-sm font-medium">
                  {new Date(profile.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                </div>
                <span className="text-sm font-medium">
                  {new Date(profile.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">User ID</span>
                </div>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{profile.id.slice(0, 8)}...</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                  <span className="text-muted-foreground">Dashboard Access</span>
                  <Badge variant="outline" className="text-xs">
                    ✓ Granted
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                  <span className="text-muted-foreground">Contact Management</span>
                  <Badge variant="outline" className="text-xs">
                    ✓ Granted
                  </Badge>
                </div>
                {(profile.role === "admin" || profile.role === "general_manager" || profile.role === "leader") && (
                  <>
                    <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                      <span className="text-muted-foreground">Campaign Management</span>
                      <Badge variant="outline" className="text-xs">
                        ✓ Granted
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                      <span className="text-muted-foreground">Analytics Access</span>
                      <Badge variant="outline" className="text-xs">
                        ✓ Granted
                      </Badge>
                    </div>
                  </>
                )}
                {profile.role === "admin" && (
                  <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                    <span className="text-muted-foreground">User Management</span>
                    <Badge variant="outline" className="text-xs">
                      ✓ Granted
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
