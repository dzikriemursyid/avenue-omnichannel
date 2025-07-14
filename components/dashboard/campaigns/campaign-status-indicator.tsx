"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Calendar, Send, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react"

interface CampaignStatusIndicatorProps {
    status: "draft" | "scheduled" | "running" | "completed" | "paused" | "failed"
    lastUpdated?: Date
    isAutoRefreshing?: boolean
    sentCount?: number
    targetCount?: number
    deliveredCount?: number
    readCount?: number
    failedCount?: number
}

export function CampaignStatusIndicator({
    status,
    lastUpdated,
    isAutoRefreshing = false,
    sentCount = 0,
    targetCount = 0,
    deliveredCount = 0,
    readCount = 0,
    failedCount = 0
}: CampaignStatusIndicatorProps) {
    const [currentTime, setCurrentTime] = useState(new Date())

    // Update current time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    const statusColors = {
        draft: "bg-gray-500",
        scheduled: "bg-blue-500",
        running: "bg-green-500",
        completed: "bg-purple-500",
        paused: "bg-yellow-500",
        failed: "bg-red-500",
    }

    const statusIcons = {
        draft: Clock,
        scheduled: Calendar,
        running: Send,
        completed: CheckCircle,
        paused: AlertCircle,
        failed: XCircle,
    }

    const StatusIcon = statusIcons[status]

    // Calculate progress percentage
    const progress = targetCount > 0 ? Math.round((sentCount / targetCount) * 100) : 0
    const deliveryRate = sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0
    const readRate = deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) : 0

    // Calculate time since last update
    const getTimeSinceUpdate = () => {
        if (!lastUpdated) return null

        const diffInSeconds = Math.floor((currentTime.getTime() - lastUpdated.getTime()) / 1000)

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
        return `${Math.floor(diffInSeconds / 3600)}h ago`
    }

    return (
        <div className="space-y-3">
            {/* Status Badge and Live Indicator */}
            <div className="flex items-center gap-2">
                <Badge variant="secondary" className={`${statusColors[status]} text-white flex items-center gap-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {status}
                </Badge>
                {status === 'running' && (
                    <div className="flex items-center gap-1 text-green-600">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">Live</span>
                    </div>
                )}
            </div>

            {/* Progress Summary */}
            {targetCount > 0 && (
                <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                        <span>Progress: {progress}%</span>
                        <span>{sentCount.toLocaleString()} / {targetCount.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                        <span className="text-green-600">✓ {deliveryRate}% delivered</span>
                        <span className="text-blue-600">👁 {readRate}% read</span>
                        {failedCount > 0 && (
                            <span className="text-red-600">✗ {failedCount} failed</span>
                        )}
                    </div>
                </div>
            )}

            {/* Last Updated Info */}
            {lastUpdated && (
                <div className="text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                        <span>Last updated: {getTimeSinceUpdate()}</span>
                        {isAutoRefreshing && status === 'running' && (
                            <span className="text-green-600 flex items-center gap-1">
                                <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                                Auto-refreshing every 5s
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
} 