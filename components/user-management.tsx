"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { UserProfile } from "@/lib/supabase/profiles"
import type { Team } from "@/lib/supabase/admin"

interface UserManagementProps {
  users: UserProfile[]
  teams: Team[]
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

export function UserManagement({ users, teams }: UserManagementProps) {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user)
    setIsEditDialogOpen(true)
  }

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl">Users</CardTitle>
            <CardDescription>Manage user accounts, roles, and permissions.</CardDescription>
          </div>
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mobile View */}
        <div className="block sm:hidden space-y-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">{user.full_name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteUser(user)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${roleColors[user.role]} text-white text-xs`}>{roleLabels[user.role]}</Badge>
                    <Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user.team_id ? (
                      <span>{teams.find((t) => t.id === user.team_id)?.name || "Unknown Team"}</span>
                    ) : (
                      <span>No team</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{user.email}</TableCell>
                  <TableCell>
                    <Badge className={`${roleColors[user.role]} text-white`}>{roleLabels[user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.team_id ? (
                      <span className="text-sm">
                        {teams.find((t) => t.id === user.team_id)?.name || "Unknown Team"}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No team</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Make changes to the user's profile and permissions.</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="sm:text-right">
                    Name
                  </Label>
                  <Input id="name" defaultValue={selectedUser.full_name} className="sm:col-span-3" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="sm:text-right">
                    Email
                  </Label>
                  <Input id="email" defaultValue={selectedUser.email} className="sm:col-span-3" disabled />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="sm:text-right">
                    Role
                  </Label>
                  <Select defaultValue={selectedUser.role}>
                    <SelectTrigger className="sm:col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="leader">Team Leader</SelectItem>
                      <SelectItem value="general_manager">General Manager</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="team" className="sm:text-right">
                    Team
                  </Label>
                  <Select defaultValue={selectedUser.team_id || "none"}>
                    <SelectTrigger className="sm:col-span-3">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="active" className="sm:text-right">
                    Active
                  </Label>
                  <Switch id="active" defaultChecked={selectedUser.is_active} className="sm:col-span-3" />
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedUser?.full_name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button variant="destructive" className="w-full sm:w-auto">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
