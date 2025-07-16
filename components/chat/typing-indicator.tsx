"use client"

import { useEffect, useState } from "react"

interface TypingIndicatorProps {
  isVisible: boolean
  userName?: string
  className?: string
}

export function TypingIndicator({ isVisible, userName = "Someone", className = "" }: TypingIndicatorProps) {
  const [dots, setDots] = useState("")

  useEffect(() => {
    if (!isVisible) {
      setDots("")
      return
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return ""
        return prev + "."
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground animate-pulse ${className}`}>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span>{userName} is typing{dots}</span>
    </div>
  )
}

// Hook for managing typing state
export function useTypingIndicator(conversationId: string) {
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const startTyping = () => {
    setIsTyping(true)
    // TODO: Implement broadcasting typing state via realtime
  }

  const stopTyping = () => {
    setIsTyping(false)
    // TODO: Implement stopping typing broadcast
  }

  // Auto stop typing after inactivity
  useEffect(() => {
    if (!isTyping) return

    const timeout = setTimeout(() => {
      stopTyping()
    }, 3000) // Stop typing after 3 seconds of inactivity

    return () => clearTimeout(timeout)
  }, [isTyping])

  return {
    isTyping,
    typingUsers,
    startTyping,
    stopTyping
  }
}