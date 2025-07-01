"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react"
import {
    useUsers,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    useTeams,
    useDebounce,
    useLazyLoad,
    useVirtualScroll
} from "@/hooks"
import { Database } from "@/lib/database.types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

const roleColors = {
    admin: "bg-red-500",
    general_manager: "bg-purple-500",
    leader: "bg-blue-500",
    agent: "bg-green-500",
}

export function UserManagementOptimized() {
    const [page, setPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

    // Debounce search for performance
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Fetch data with hooks
    const { users, pagination, loading, refetch } = useUsers({
        page,
        limit: 20,
        search: debouncedSearch // This would need API support
    })

    const { teams } = useTeams()
    const createUser = useCreateUser()
    const updateUser = useUpdateUser()
    const deleteUser = useDeleteUser()

    // Memoize filtered users for performance
    const filteredUsers = useMemo(() => {
        if (!debouncedSearch) return users

        return users.filter(user =>
            user.full_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            user.email.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
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

    // Handlers with useCallback for performance
    const handleCreateUser = useCallback(async (data: any) => {
        await createUser.execute(data)
        refetch()
    }, [createUser, refetch])

    const handleUpdateUser = useCallback(async (id: string, data: any) => {
        await updateUser.execute(id, data)
        refetch()
    }, [updateUser, refetch])

    const handleDeleteUser = useCallback(async (id: string) => {
        if (confirm("Are you sure?")) {
            await deleteUser.execute(id)
            refetch()
        }
    }, [deleteUser, refetch])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">User Management</h2>
                    <p className="text-muted-foreground">Optimized with hooks and performance features</p>
                </div>

                <Button onClick={() => {/* Open create dialog */ }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                </Button>
            </div>

            {/* Lazy loaded stats */}
            <div ref={statsRef}>
                {statsVisible && (
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
                )}
            </div>

            {/* Search with debounce */}
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
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Virtual scrolling for performance */}
                            <div
                                className="overflow-auto"
                                style={{ height: '600px' }}
                                onScroll={handleScroll}
                            >
                                <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
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
                                        <TableBody style={{ transform: `translateY(${offsetY}px)` }}>
                                            {visibleItems.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{user.full_name}</div>
                                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={roleColors[user.role]}>
                                                            {user.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {user.team_id
                                                            ? teams.find(t => t.id === user.team_id)?.name || "Unknown"
                                                            : "No Team"
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={user.is_active ? "default" : "secondary"}>
                                                            {user.is_active ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {/* Open edit dialog */ }}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                disabled={deleteUser.loading}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
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
        </div>
    )
} 