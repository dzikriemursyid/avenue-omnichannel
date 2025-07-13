"use client";

import { ArrowLeft, Download, Upload, Users, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactsManager } from "./contacts-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function ContactsAllPage() {
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

                {/* Right side - Action buttons */}
                <div className="flex items-center gap-2 overflow-x-auto">
                    <Button variant="outline" size="sm" className="flex items-center gap-2 whitespace-nowrap">
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export All</span>
                        <span className="sm:hidden">Export</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 whitespace-nowrap">
                        <Upload className="h-4 w-4" />
                        <span className="">Import</span>
                    </Button>
                </div>
            </div>

            {/* Description Card */}
            <Card className="overflow-hidden">
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0">
                            <Globe className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-xl sm:text-2xl tracking-tight flex items-center gap-2">
                                All Contacts
                                <Badge variant="secondary" className="text-xs">
                                    Global View
                                </Badge>
                            </CardTitle>
                            <p className="text-sm sm:text-base text-muted-foreground mt-1">
                                View and manage all contacts across all groups
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    All Groups
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    Unified View
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Contacts List */}
            <div className="min-h-0 flex-1">
                <ContactsManager
                    groupId="all"
                    showGroupFilters={false}
                />
            </div>
        </div>
    );
} 