import type { UserProfile as UserProfileType } from "@/lib/supabase/profiles"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Shield } from "lucide-react"

interface UserProfileProps {
  profile: UserProfileType
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

export default function UserProfile({ profile }: UserProfileProps) {
  return (
    <Card className="w-full max-w-md bg-[#1c1c1c] border-gray-800">
      <CardHeader className="text-center">
        <CardTitle className="text-white flex items-center justify-center gap-2">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-400">Full Name</p>
              <p className="text-white font-medium">{profile.full_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white font-medium">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-400">Role</p>
              <Badge className={`${roleColors[profile.role]} text-white`}>{roleLabels[profile.role]}</Badge>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Status</span>
            <Badge variant={profile.is_active ? "default" : "secondary"}>
              {profile.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
