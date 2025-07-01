"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Building, Plus } from "lucide-react"
import { useTeams, useInfiniteScroll, useLazyLoad } from "@/hooks"

export function TeamListOptimized() {
    const [page, setPage] = useState(1)
    const [allTeams, setAllTeams] = useState<any[]>([])

    const { teams, pagination, loading, refetch } = useTeams({
        page,
        limit: 10
    })

    // Append new teams to the list
    useCallback(() => {
        if (teams.length > 0) {
            setAllTeams(prev => page === 1 ? teams : [...prev, ...teams])
        }
    }, [teams, page])

    // Infinite scroll trigger
    const loadMoreRef = useInfiniteScroll(() => {
        if (!loading && pagination && page < pagination.totalPages) {
            setPage(p => p + 1)
        }
    })

    // Lazy load images/avatars
    const TeamCard = ({ team }: { team: any }) => {
        const [cardRef, isVisible] = useLazyLoad()

        return (
            <div ref={cardRef}>
                {isVisible ? (
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{team.name}</CardTitle>
                                    <CardDescription>{team.description}</CardDescription>
                                </div>
                                <Badge variant={team.is_active ? "default" : "secondary"}>
                                    {team.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    <span>{team.member_count || 0} members</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Building className="h-4 w-4" />
                                    <span>Created {new Date(team.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48 mt-2" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Teams</h2>
                    <p className="text-muted-foreground">
                        Manage your organization's teams
                    </p>
                </div>

                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                </Button>
            </div>

            {/* Team Grid with Lazy Loading */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                ))}
            </div>

            {/* Loading indicator for initial load */}
            {loading && page === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-48 mt-2" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                {loading && page > 1 && (
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading more teams...</span>
                    </div>
                )}
            </div>

            {/* End of list indicator */}
            {!loading && pagination && page >= pagination.totalPages && allTeams.length > 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                    You've reached the end • {pagination.total} teams total
                </p>
            )}
        </div>
    )
} 