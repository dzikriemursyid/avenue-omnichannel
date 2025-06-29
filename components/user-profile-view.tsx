"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Shield, Calendar, Building2, Edit } from "lucide-react"
import type { UserProfile } from "@/lib/supabase/profiles"
import { useState } from "react"

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

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Your account details and role information</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              {isEditing ? (
                <Input id="full_name" defaultValue={profile.full_name} />
              ) : (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{profile.full_name}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{profile.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Badge className={`${roleColors[profile.role]} text-white`}>{roleLabels[profile.role]}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Team</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profile.team_id ? "Team Member" : "No team assigned"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Account Status</Label>
              <Badge variant={profile.is_active ? "default" : "secondary"}>
                {profile.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          {isEditing && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button>Save Changes</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Account Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Account Details
          </CardTitle>
          <CardDescription>Account creation and activity information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm font-medium">
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm font-medium">
                {new Date(profile.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">User ID</span>
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{profile.id.slice(0, 8)}...</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Permissions</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dashboard Access</span>
                <Badge variant="outline" className="text-xs">
                  ✓ Granted
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Contact Management</span>
                <Badge variant="outline" className="text-xs">
                  ✓ Granted
                </Badge>
              </div>
              {(profile.role === "admin" || profile.role === "general_manager" || profile.role === "leader") && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Campaign Management</span>
                    <Badge variant="outline" className="text-xs">
                      ✓ Granted
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Analytics Access</span>
                    <Badge variant="outline" className="text-xs">
                      ✓ Granted
                    </Badge>
                  </div>
                </>
              )}
              {profile.role === "admin" && (
                <div className="flex items-center justify-between text-sm">
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
  )
}
