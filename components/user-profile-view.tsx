"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Shield, Calendar, Building2, Edit, Upload, Trash2, X, Phone, CheckCircle, Clock, Key } from "lucide-react"
import type { UserProfile } from "@/lib/supabase/profiles"
import { useState, useRef } from "react"
import { updateProfile, uploadProfileAvatar, deleteProfileAvatar } from "@/lib/actions/profile"
import { toast } from "sonner"

interface UserProfileViewProps {
  profile: UserProfile
}

const roleColors = {
  admin: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
  general_manager: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
  leader: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
  agent: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
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
    setFormData(prev => ({ ...prev, [field]: value }))
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
      if (!file.type.startsWith('image/')) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-8 max-w-6xl mx-auto p-4 md:p-8">
        {/* Profile Information Card */}
        <Card className="shadow-xl rounded-3xl border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader className="pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <User className="h-5 w-5" />
                  </div>
                  Profile Information
                </CardTitle>
                <CardDescription className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                  Manage your account details and personal information
                </CardDescription>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <Avatar className="h-28 w-28 md:h-32 md:w-32 shadow-2xl border-4 border-white dark:border-zinc-800 relative z-10">
                  <AvatarImage src={previewUrl || undefined} alt={profile.full_name} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-2 right-2 rounded-full shadow-lg border-2 border-white dark:border-zinc-800 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {isEditing && (
                <div className="flex flex-col items-center space-y-3 w-full">
                  <div className="flex items-center space-x-3">
                    {profile.avatar_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteAvatar}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 transition-all duration-300"
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    Max 2MB • JPG, PNG, GIF
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="full_name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange("full_name", e.target.value)}
                    disabled={isLoading}
                    className="rounded-xl border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-semibold text-base md:text-lg text-gray-900 dark:text-white">{profile.full_name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email Address</Label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm md:text-base text-gray-700 dark:text-gray-300">{profile.email}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone_number" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange("phone_number", e.target.value)}
                    placeholder="Enter phone number"
                    disabled={isLoading}
                    className="rounded-xl border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Phone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm md:text-base text-gray-700 dark:text-gray-300">
                      {profile.phone_number || "Not provided"}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Role</Label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <Badge className={`${roleColors[profile.role]} text-white text-xs md:text-sm px-3 py-1 rounded-full shadow-lg`}>
                    {roleLabels[profile.role]}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Team</Label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-sm md:text-base text-gray-700 dark:text-gray-300">{profile.team_id ? "Team Member" : "No team assigned"}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account Status</Label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <Badge variant={profile.is_active ? "default" : "secondary"} className="rounded-full px-3 py-1 text-xs md:text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                    {profile.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {isEditing && (
              <>
                <Separator className="bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600" />
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="w-full sm:w-auto border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card className="shadow-xl rounded-3xl border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <Calendar className="h-5 w-5" />
              </div>
              Account Details
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Account creation and activity information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Member Since</span>
                </div>
                <span className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                  {new Date(profile.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Last Updated</span>
                </div>
                <span className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                  {new Date(profile.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Key className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">User ID</span>
                </div>
                <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-gray-700 dark:text-gray-300">{profile.id.slice(0, 8)}...</span>
              </div>
            </div>

            <Separator className="bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600" />

            <div className="space-y-4">
              <h4 className="text-sm md:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                Permissions
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
                  <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">Dashboard Access</span>
                  <Badge variant="outline" className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700">
                    ✓ Granted
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                  <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">Contact Management</span>
                  <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700">
                    ✓ Granted
                  </Badge>
                </div>
                {(profile.role === "admin" || profile.role === "general_manager" || profile.role === "leader") && (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                      <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">Campaign Management</span>
                      <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700">
                        ✓ Granted
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                      <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">Analytics Access</span>
                      <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700">
                        ✓ Granted
                      </Badge>
                    </div>
                  </>
                )}
                {profile.role === "admin" && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
                    <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">User Management</span>
                    <Badge variant="outline" className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700">
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
