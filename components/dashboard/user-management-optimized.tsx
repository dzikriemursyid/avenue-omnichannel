"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
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
import { Plus, Edit, Trash2, MoreHorizontal, UserX, Key, Search, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
    useUsers,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    useUpdatePassword,
    useTeams,
    useDebounce,
    useLazyLoad,
    useVirtualScroll
} from "@/hooks"
import { Database } from "@/lib/database.types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Team = Database["public"]["Tables"]["teams"]["Row"]

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

interface UserManagementOptimizedProps {
    currentUser: Profile
}

export function UserManagementOptimized({ currentUser }: UserManagementOptimizedProps) {
    const [page, setPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null)

    // Debug logging
    useEffect(() => {
        console.log("🔍 UserManagementOptimized: Component mounted")
        console.log("👤 Current user:", currentUser)
    }, [currentUser])

    // Debounce search for performance
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Debug logging for search
    useEffect(() => {
        console.log("🔍 Search query changed:", { searchQuery, debouncedSearch })
    }, [searchQuery, debouncedSearch])

    // Fetch data with hooks
    const { users, pagination, loading, refetch } = useUsers({
        page,
        limit: 20,
        search: debouncedSearch
    })

    const { teams } = useTeams()
    const createUser = useCreateUser()
    const updateUser = useUpdateUser()
    const deleteUser = useDeleteUser()

    // Debug logging for data fetching
    useEffect(() => {
        console.log("📊 Data fetched:", {
            usersCount: users.length,
            teamsCount: teams.length,
            pagination,
            loading
        })
    }, [users, teams, pagination, loading])

    // Filter roles yang bisa di-assign berdasarkan current user role
    const getAssignableRoles = useCallback(() => {
        console.log("🎭 Getting assignable roles for:", currentUser.role)
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
    }, [currentUser.role])

    // Memoize filtered users for performance
    const filteredUsers = useMemo(() => {
        if (!debouncedSearch) return users

        const filtered = users.filter(user =>
            user.full_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            user.email.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
        console.log("🔍 Filtered users:", { original: users.length, filtered: filtered.length })
        return filtered
    }, [users, debouncedSearch])

    // Virtual scrolling for large lists
    const {
        visibleItems,
        totalHeight,
        offsetY,
        handleScroll
    } = useVirtualScroll(filteredUsers, 60, 600, 5)

    // Lazy load stats cards
    const [statsRef, statsVisible] = useLazyLoad()

    // Permission check
    const canManageUser = useCallback((targetUser: Profile) => {
        const canManage = (
            currentUser.role === 'admin' ||
            (currentUser.role === 'general_manager' && targetUser.role !== 'admin') ||
            (currentUser.role === 'leader' &&
                targetUser.role === 'agent' &&
                targetUser.team_id === currentUser.team_id)
        )
        console.log("🔐 Permission check:", {
            currentUserRole: currentUser.role,
            targetUserRole: targetUser.role,
            canManage
        })
        return canManage
    }, [currentUser])

    // Handlers with useCallback for performance
    const handleCreateUser = useCallback(async (formData: FormData) => {
        console.log("➕ Creating user with form data")
        try {
            const data = {
                email: formData.get("email") as string,
                password: formData.get("password") as string,
                full_name: formData.get("full_name") as string,
                role: formData.get("role") as string,
                team_id: formData.get("team_id") === "none" ? undefined : formData.get("team_id") as string,
            }
            console.log("📝 Create user data:", data)

            await createUser.execute(data)
            console.log("✅ User created successfully")
            setIsCreateDialogOpen(false)
            refetch()
        } catch (error) {
            console.error("❌ Failed to create user:", error)
        }
    }, [createUser, refetch])

    const handleUpdateUser = useCallback(async (formData: FormData) => {
        if (!selectedUser) return

        console.log("✏️ Updating user:", selectedUser.id)
        try {
            const data = {
                full_name: formData.get("full_name") as string,
                role: formData.get("role") as string,
                team_id: formData.get("team_id") === "none" ? undefined : formData.get("team_id") as string,
                is_active: formData.get("is_active") === "on",
            }
            console.log("📝 Update user data:", data)

            await updateUser.execute(selectedUser.id, data)
            console.log("✅ User updated successfully")
            setIsEditDialogOpen(false)
            setSelectedUser(null)
            refetch()
        } catch (error) {
            console.error("❌ Failed to update user:", error)
        }
    }, [updateUser, selectedUser, refetch])

    const handleDeleteUser = useCallback(async (userId: string) => {
        console.log("🗑️ Deleting user:", userId)
        try {
            await deleteUser.execute(userId)
            console.log("✅ User deleted successfully")
            setIsDeleteDialogOpen(false)
            setUserToDelete(null)
            refetch()
        } catch (error) {
            console.error("❌ Failed to delete user:", error)
        }
    }, [deleteUser, refetch])

    const handleUpdatePassword = useCallback(async (formData: FormData) => {
        if (!selectedUser) return

        console.log("🔑 Updating password for user:", selectedUser.id)
        try {
            const data = {
                password: formData.get("password") as string,
            }
            console.log("📝 Password update data:", { userId: selectedUser.id })

            // Note: This would need a separate API endpoint for password updates
            // For now, we'll use the update user endpoint
            await updateUser.execute(selectedUser.id, data)
            console.log("✅ Password updated successfully")
            setIsPasswordDialogOpen(false)
            setSelectedUser(null)
        } catch (error) {
            console.error("❌ Failed to update password:", error)
        }
    }, [updateUser, selectedUser])

    const handleDeactivateUser = useCallback(async (userId: string) => {
        console.log("🚫 Deactivating user:", userId)
        try {
            await updateUser.execute(userId, { is_active: false })
            console.log("✅ User deactivated successfully")
            refetch()
        } catch (error) {
            console.error("❌ Failed to deactivate user:", error)
        }
    }, [updateUser, refetch])

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
                        <div className="text-2xl font-bold">{pagination?.total || 0}</div>
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
                    <div className="flex justify-between items-center">
                        <CardTitle>Users</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <CardDescription>
                        Daftar semua users dan informasi mereka
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Mobile View */}
                            <div className="block sm:hidden space-y-4">
                                {filteredUsers.map((user) => (
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
                                                                        onClick={() => {
                                                                            setUserToDelete(user)
                                                                            setIsDeleteDialogOpen(true)
                                                                        }}
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
                                        {filteredUsers.map((user) => (
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
                                                                            onClick={() => {
                                                                                setUserToDelete(user)
                                                                                setIsDeleteDialogOpen(true)
                                                                            }}
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

                            {/* Pagination */}
                            {pagination && pagination.totalPages > 1 && (
                                <div className="flex justify-between items-center mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} users
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page === pagination.totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
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
                            <Button type="submit" disabled={createUser.loading}>
                                {createUser.loading ? "Creating..." : "Create User"}
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
                                <Button type="submit" disabled={updateUser.loading}>
                                    {updateUser.loading ? "Updating..." : "Update User"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

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
                                <Button type="submit" disabled={updateUser.loading}>
                                    {updateUser.loading ? "Updating..." : "Update Password"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete User Confirmation Dialog */}
            {userToDelete && (
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-red-600">Delete User</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to permanently delete <strong>{userToDelete.full_name}</strong>?
                                This action cannot be undone and will remove all associated data.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Warning</h4>
                                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                            This will permanently delete the user account and all associated data including:
                                        </p>
                                        <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
                                            <li>• User profile and settings</li>
                                            <li>• Team assignments</li>
                                            <li>• Conversation history</li>
                                            <li>• All user-generated content</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-600">
                                            {userToDelete.full_name.split(' ').map(n => n[0]).join('')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{userToDelete.full_name}</p>
                                    <p className="text-xs text-gray-500">{userToDelete.email}</p>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <Badge className={roleColors[userToDelete.role]}>
                                            {roleLabels[userToDelete.role]}
                                        </Badge>
                                        <Badge variant={userToDelete.is_active ? "default" : "secondary"}>
                                            {userToDelete.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsDeleteDialogOpen(false)
                                    setUserToDelete(null)
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => handleDeleteUser(userToDelete.id)}
                                disabled={deleteUser.loading}
                            >
                                {deleteUser.loading ? "Deleting..." : "Delete User"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
} 