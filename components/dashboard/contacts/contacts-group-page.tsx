"use client";

import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactsManager } from "./contacts-manager";
import { useContactGroup } from "@/hooks/use-contact-groups";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface ContactsGroupPageProps {
    groupId: string;
}

export function ContactsGroupPage({ groupId }: ContactsGroupPageProps) {
    const { group, loading, error } = useContactGroup(groupId);
    const router = useRouter();

    const handleBackToGroups = () => {
        router.push("/dashboard/contacts");
    };

    return (
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
            {/* Header with Back Button */}
            <div className="flex gap-4 sm:items-center justify-between">
                {/* Left side - Navigation and title */}
                <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToGroups}
                        className="flex items-center gap-2 w-fit"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Back to Groups</span>
                        <span className="sm:hidden">Back</span>
                    </Button>
                </div>

            </div>

            {/* Group Details Card */}
            {loading && (
                <Card className="overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-muted animate-pulse flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="h-6 bg-muted animate-pulse rounded mb-2" />
                                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {error && (
                <Card className="overflow-hidden border-destructive">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <CardTitle className="text-xl sm:text-2xl tracking-tight text-destructive">
                                    Error Loading Group
                                </CardTitle>
                                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                                    {error.message || "Failed to load group details"}
                                </p>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    Group ID: {groupId}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {group && !loading && !error && (
                <Card className="overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                            <div
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white flex-shrink-0"
                                style={{ backgroundColor: group.color || "#3B82F6" }}
                            >
                                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <CardTitle className="text-xl sm:text-2xl tracking-tight truncate flex items-center gap-2">
                                    {group.name}
                                    <Badge variant="secondary" className="text-xs">
                                        Group
                                    </Badge>
                                </CardTitle>
                                {group.description ? (
                                    <p className="text-sm sm:text-base text-muted-foreground mt-1 line-clamp-2">
                                        {group.description}
                                    </p>
                                ) : (
                                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                                        Manage contacts in this group
                                    </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {group.contact_count || 0} <span className="hidden sm:inline">contacts</span>
                                    </Badge>
                                    {group.created_at && (
                                        <Badge variant="outline" className="text-xs">
                                            Created {new Date(group.created_at).toLocaleDateString()}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {/* Fallback card if no group data is available */}
            {!group && !loading && !error && (
                <Card className="overflow-hidden border-orange-200">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <CardTitle className="text-xl sm:text-2xl tracking-tight flex items-center gap-2">
                                    Group Not Found
                                    <Badge variant="outline" className="text-xs">
                                        Missing
                                    </Badge>
                                </CardTitle>
                                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                                    The requested group could not be found or you don't have permission to view it.
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                        Group ID: {groupId}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {/* Contacts List */}
            <div className="min-h-0 flex-1">
                <ContactsManager
                    groupId={groupId}
                    showGroupFilters={false}
                    showCSVActions={true}
                />
            </div>
        </div>
    );
} 