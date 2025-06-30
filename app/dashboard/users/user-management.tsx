"use client"

import { useState, useTransition } from "react"
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
import { Plus, Edit, Trash2, MoreHorizontal, Mail, UserX, Key, Users } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import type { UserProfile } from "@/lib/supabase/profiles"
import type { Team } from "@/lib/supabase/admin"
import {
    createUser,
    updateUser,
    deactivateUser,
    deleteUser,
    updateUserPassword,
    createTeam,
    assignUserToTeam
} from "@/lib/actions/user-management"

interface UserManagementProps {
    users: UserProfile[]
    teams: Team[]
    currentUser: UserProfile
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

export function UserManagement({ users, teams, currentUser }: UserManagementProps) {
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
    const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false)
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])
    const [isPending, startTransition] = useTransition()

    // Filter roles yang bisa di-assign berdasarkan current user role
    const getAssignableRoles = () => {
        switch (currentUser.role) {
            case 'admin':
                return ['admin', 'general_manager', 'leader', 'agent']
            case 'general_manager':
                return ['general_manager', 'leader', 'agent']
            case 'leader':
                return ['agent']
            default:
                return []
        }
    }

    const handleCreateUser = async (formData: FormData) => {
        startTransition(async () => {
            const result = await createUser(formData)

            if (result.success) {
                toast.success("User Created Successfully", {
                    description: result.message,
                })
                setIsCreateDialogOpen(false)
            } else {
                toast.error("Failed to Create User", {
                    description: result.message || "An error occurred while creating the user",
                })

                // Show validation errors if they exist
                if (result.errors) {
                    Object.entries(result.errors).forEach(([field, messages]) => {
                        toast.error(`Validation Error: ${field}`, {
                            description: messages.join(", "),
                        })
                    })
                }
            }
        })
    }

    const handleUpdateUser = async (formData: FormData) => {
        startTransition(async () => {
            const result = await updateUser(formData)

            if (result.success) {
                toast.success("User Updated Successfully", {
                    description: result.message,
                })
                setIsEditDialogOpen(false)
                setSelectedUser(null)
            } else {
                toast.error("Failed to Update User", {
                    description: result.message || "An error occurred while updating the user",
                })

                // Show validation errors if they exist
                if (result.errors) {
                    Object.entries(result.errors).forEach(([field, messages]) => {
                        toast.error(`Validation Error: ${field}`, {
                            description: messages.join(", "),
                        })
                    })
                }
            }
        })
    }

    const handleDeactivateUser = async (userId: string) => {
        startTransition(async () => {
            const result = await deactivateUser(userId)

            if (result.success) {
                toast.success("User Deactivated", {
                    description: result.message,
                })
            } else {
                toast.error("Failed to Deactivate User", {
                    description: result.message,
                })
            }
        })
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
            return
        }

        startTransition(async () => {
            const result = await deleteUser(userId)

            if (result.success) {
                toast.success("User Deleted Successfully", {
                    description: result.message,
                })
            } else {
                toast.error("Failed to Delete User", {
                    description: result.message,
                })
            }
        })
    }

    const handleUpdatePassword = async (formData: FormData) => {
        startTransition(async () => {
            const result = await updateUserPassword(formData)

            if (result.success) {
                toast.success("Password Updated Successfully", {
                    description: result.message,
                })
                setIsPasswordDialogOpen(false)
                setSelectedUser(null)
            } else {
                toast.error("Failed to Update Password", {
                    description: result.message || "An error occurred while updating the password",
                })
            }
        })
    }

    const handleCreateTeam = async (formData: FormData) => {
        startTransition(async () => {
            const result = await createTeam(formData)

            if (result.success) {
                toast.success("Team Created Successfully", {
                    description: result.message,
                })
                setIsCreateTeamDialogOpen(false)
            } else {
                toast.error("Failed to Create Team", {
                    description: result.message || "An error occurred while creating the team",
                })

                // Show validation errors if they exist
                if (result.errors) {
                    Object.entries(result.errors).forEach(([field, messages]) => {
                        toast.error(`Validation Error: ${field}`, {
                            description: messages.join(", "),
                        })
                    })
                }
            }
        })
    }

    const canManageUser = (targetUser: UserProfile) => {
        if (currentUser.role === 'admin') return true
        if (currentUser.role === 'general_manager' && targetUser.role !== 'admin') return true
        if (currentUser.role === 'leader' &&
            targetUser.role === 'agent' &&
            targetUser.team_id === currentUser.team_id) return true
        return false
    }

    return (
        <div className="space-y-6">
            {/* Header dengan actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div>
                    <h2 className="text-2xl font-bold">User Management</h2>
                    <p className="text-muted-foreground">
                        Kelola users, roles, dan team assignments
                    </p>
                </div>

                <div className="flex gap-2">
                    {(currentUser.role === 'admin' || currentUser.role === 'general_manager') && (
                        <Button
                            onClick={() => setIsCreateTeamDialogOpen(true)}
                            variant="outline"
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Buat Team
                        </Button>
                    )}

                    {currentUser.role === 'admin' && (
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah User
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">{users.length}</div>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">
                            {users.filter(u => u.is_active).length}
                        </div>
                        <p className="text-sm text-muted-foreground">Active Users</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">{teams.length}</div>
                        <p className="text-sm text-muted-foreground">Teams</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">
                            {users.filter(u => u.role === 'agent').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Agents</p>
                    </CardContent>
                </Card>
            </div>

            {/* User Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                        Daftar semua users dan informasi mereka
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Mobile View */}
                    <div className="block sm:hidden space-y-4">
                        {users.map((user) => (
                            <Card key={user.id} className="p-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium">{user.full_name}</h3>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {canManageUser(user) && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedUser(user)
                                                            setIsEditDialogOpen(true)
                                                        }}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        {currentUser.role === 'admin' && (
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedUser(user)
                                                                setIsPasswordDialogOpen(true)
                                                            }}>
                                                                <Key className="h-4 w-4 mr-2" />
                                                                Update Password
                                                            </DropdownMenuItem>
                                                        )}
                                                        {user.is_active && user.id !== currentUser.id && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeactivateUser(user.id)}
                                                                className="text-red-600"
                                                            >
                                                                <UserX className="h-4 w-4 mr-2" />
                                                                Deactivate
                                                            </DropdownMenuItem>
                                                        )}
                                                        {currentUser.role === 'admin' && user.id !== currentUser.id && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <Badge className={roleColors[user.role]}>
                                            {roleLabels[user.role]}
                                        </Badge>
                                        <Badge variant={user.is_active ? "default" : "secondary"}>
                                            {user.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>

                                    {user.team_id && (
                                        <p className="text-sm text-muted-foreground">
                                            Team: {teams.find(t => t.id === user.team_id)?.name || "Unknown"}
                                        </p>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden sm:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Team</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{user.full_name}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={roleColors[user.role]}>
                                                {roleLabels[user.role]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.team_id ? (
                                                teams.find(t => t.id === user.team_id)?.name || "Unknown"
                                            ) : (
                                                <span className="text-muted-foreground">No Team</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.is_active ? "default" : "secondary"}>
                                                {user.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {canManageUser(user) && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedUser(user)
                                                                setIsEditDialogOpen(true)
                                                            }}>
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            {currentUser.role === 'admin' && (
                                                                <DropdownMenuItem onClick={() => {
                                                                    setSelectedUser(user)
                                                                    setIsPasswordDialogOpen(true)
                                                                }}>
                                                                    <Key className="h-4 w-4 mr-2" />
                                                                    Update Password
                                                                </DropdownMenuItem>
                                                            )}
                                                            {user.is_active && user.id !== currentUser.id && (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDeactivateUser(user.id)}
                                                                    className="text-red-600"
                                                                >
                                                                    <UserX className="h-4 w-4 mr-2" />
                                                                    Deactivate
                                                                </DropdownMenuItem>
                                                            )}
                                                            {currentUser.role === 'admin' && user.id !== currentUser.id && (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                    className="text-red-600"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            )}
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Create User Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah User Baru</DialogTitle>
                        <DialogDescription>
                            Buat user baru dengan password langsung
                        </DialogDescription>
                    </DialogHeader>

                    <form action={handleCreateUser} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="user@company.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nama Lengkap</Label>
                            <Input
                                id="full_name"
                                name="full_name"
                                required
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="Minimal 6 karakter"
                                minLength={6}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select name="role" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getAssignableRoles().map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {roleLabels[role as keyof typeof roleLabels]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="team_id">Team</Label>
                            <Select name="team_id">
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih team (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Team</SelectItem>
                                    {teams.map((team) => (
                                        <SelectItem key={team.id} value={team.id}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Creating..." : "Create User"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            {selectedUser && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>
                                Update user information dan permissions
                            </DialogDescription>
                        </DialogHeader>

                        <form action={handleUpdateUser} className="space-y-4">
                            <input type="hidden" name="user_id" value={selectedUser.id} />

                            <div className="space-y-2">
                                <Label htmlFor="edit_full_name">Nama Lengkap</Label>
                                <Input
                                    id="edit_full_name"
                                    name="full_name"
                                    defaultValue={selectedUser.full_name}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_role">Role</Label>
                                <Select name="role" defaultValue={selectedUser.role}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getAssignableRoles().map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {roleLabels[role as keyof typeof roleLabels]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_team_id">Team</Label>
                                <Select name="team_id" defaultValue={selectedUser.team_id || "none"}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Team</SelectItem>
                                        {teams.map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit_is_active"
                                    name="is_active"
                                    defaultChecked={selectedUser.is_active}
                                />
                                <Label htmlFor="edit_is_active">Active</Label>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false)
                                        setSelectedUser(null)
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Updating..." : "Update User"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Create Team Dialog */}
            <Dialog open={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Buat Team Baru</DialogTitle>
                        <DialogDescription>
                            Buat team baru untuk organisasi users
                        </DialogDescription>
                    </DialogHeader>

                    <form action={handleCreateTeam} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="team_name">Nama Team</Label>
                            <Input
                                id="team_name"
                                name="name"
                                required
                                placeholder="Customer Support"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="team_description">Deskripsi</Label>
                            <Input
                                id="team_description"
                                name="description"
                                placeholder="Tim yang menangani customer support"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="team_leader_id">Team Leader</Label>
                            <Select name="leader_id">
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih team leader (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Leader</SelectItem>
                                    {users
                                        .filter(u => u.role === 'leader' && u.is_active)
                                        .map((user) => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.full_name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateTeamDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Creating..." : "Create Team"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Update Password Dialog */}
            {selectedUser && (
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Password</DialogTitle>
                            <DialogDescription>
                                Update password untuk {selectedUser.full_name}
                            </DialogDescription>
                        </DialogHeader>

                        <form action={handleUpdatePassword} className="space-y-4">
                            <input type="hidden" name="user_id" value={selectedUser.id} />

                            <div className="space-y-2">
                                <Label htmlFor="update_password">Password Baru</Label>
                                <Input
                                    id="update_password"
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="Minimal 6 karakter"
                                    minLength={6}
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsPasswordDialogOpen(false)
                                        setSelectedUser(null)
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Updating..." : "Update Password"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
} 