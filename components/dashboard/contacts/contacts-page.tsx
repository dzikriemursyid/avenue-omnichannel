"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Search, Filter, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactGroupsManager } from "./contacts-groups-manager";
import { ContactsManager } from "./contacts-manager";
import { useContactGroup } from "@/hooks/use-contact-groups";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ContactsPage() {
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const { group } = useContactGroup(selectedGroupId || "");

    const handleGroupSelect = (groupId: string) => {
        setSelectedGroupId(groupId);
    };

    const handleBackToGroups = () => {
        setSelectedGroupId(null);
        setSearchTerm("");
    };

    if (selectedGroupId) {
        return (
            <div className="space-y-4">
                {/* Header with Back Button */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBackToGroups}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft size={16} />
                            Back to Groups
                        </Button>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm">
                                {group?.name || "Loading..."}
                            </Badge>
                            <span className="text-sm text-gray-500">
                                {group?.contact_count || 0} contacts
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Download size={16} className="mr-2" />
                            Export
                        </Button>
                        <Button variant="outline" size="sm">
                            <Upload size={16} className="mr-2" />
                            Import
                        </Button>
                    </div>
                </div>

                {/* Group Details Card */}
                {group && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                                    style={{ backgroundColor: group.color }}
                                >
                                    <Plus size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">{group.name}</CardTitle>
                                    {group.description && (
                                        <p className="text-sm text-gray-600">{group.description}</p>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                )}

                {/* Search and Filter */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                        <Search size={16} className="text-gray-400" />
                        <Input
                            placeholder="Search contacts in this group..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                    <Button variant="outline" size="sm">
                        <Filter size={16} className="mr-2" />
                        Filter
                    </Button>
                </div>

                {/* Contacts List */}
                <ContactsManager
                    groupId={selectedGroupId}
                    searchTerm={searchTerm}
                    showGroupFilters={false}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Contacts</h1>
                    <p className="text-gray-600">Manage your contact groups and contacts</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <Download size={16} className="mr-2" />
                        Export All
                    </Button>
                    <Button variant="outline" size="sm">
                        <Upload size={16} className="mr-2" />
                        Import
                    </Button>
                </div>
            </div>

            {/* Contact Groups Manager */}
            <ContactGroupsManager onGroupSelect={handleGroupSelect} />
        </div>
    );
} 