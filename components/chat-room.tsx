"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Send, Phone, MoreVertical, CheckCircle, User, Paperclip, Smile, Info } from "lucide-react"
import Link from "next/link"
import type { UserProfile } from "@/lib/supabase/profiles"

interface Message {
  id: string
  conversation_id: string
  direction: "inbound" | "outbound"
  message_type: "text" | "image" | "document" | "audio" | "video"
  content: string
  timestamp: Date
  sent_by: string | null
}

interface Contact {
  id: string
  name: string
  phone_number: string
  profile_picture_url: string | null
}

interface Conversation {
  id: string
  contact: Contact
  status: "open" | "pending" | "closed"
  priority: "low" | "normal" | "high" | "urgent"
  assigned_agent: string
  created_at: Date
  last_message_at: Date
}

interface ChatRoomProps {
  conversation: Conversation
  messages: Message[]
  currentUser: UserProfile
}

export function ChatRoom({ conversation, messages, currentUser }: ChatRoomProps) {
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    // Here you would typically send the message to your backend
    console.log("Sending message:", newMessage)
    setNewMessage("")
    inputRef.current?.focus()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const statusColors = {
    open: "bg-green-500",
    pending: "bg-yellow-500",
    closed: "bg-gray-500",
  }

  const priorityColors = {
    low: "bg-blue-500",
    normal: "bg-gray-500",
    high: "bg-red-500",
    urgent: "bg-red-600",
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 48) {
      return "Yesterday " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
      {/* Chat Header */}
      <Card className="rounded-b-none border-b-0">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Link href="/dashboard/conversations">
                <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback>
                  {conversation.contact.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold truncate">{conversation.contact.name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{conversation.contact.phone_number}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`${statusColors[conversation.status]} text-white text-xs`}>{conversation.status}</Badge>
              <Badge className={`${priorityColors[conversation.priority]} text-white text-xs`}>
                {conversation.priority}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Info className="h-4 w-4 mr-2" />
                    Conversation Info
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <User className="h-4 w-4 mr-2" />
                    Contact Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Mark as Resolved</DropdownMenuItem>
                  <DropdownMenuItem>Transfer Conversation</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 rounded-none border-t-0 border-b-0 overflow-hidden">
        <CardContent className="p-0 h-full">
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => {
              const isOutbound = message.direction === "outbound"
              const showTimestamp =
                index === 0 ||
                messages[index - 1].direction !== message.direction ||
                message.timestamp.getTime() - messages[index - 1].timestamp.getTime() > 5 * 60 * 1000 // 5 minutes

              return (
                <div key={message.id} className="space-y-2">
                  {showTimestamp && (
                    <div className="flex justify-center">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                    <div className={`flex items-end gap-2 max-w-[80%] ${isOutbound ? "flex-row-reverse" : "flex-row"}`}>
                      {!isOutbound && (
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {conversation.contact.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          isOutbound ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isOutbound ? "justify-end" : "justify-start"}`}>
                          <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
                          {isOutbound && <CheckCircle className="h-3 w-3 opacity-70" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2 max-w-[80%]">
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {conversation.contact.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted text-muted-foreground border rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Message Input */}
      <Card className="rounded-t-none border-t-0">
        <CardContent className="p-4">
          <div className="flex items-end gap-2">
            <Button variant="ghost" size="sm" className="p-2 h-8 w-8 flex-shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="pr-10 resize-none"
                disabled={conversation.status === "closed"}
              />
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 p-1 h-6 w-6">
                <Smile className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || conversation.status === "closed"}
              size="sm"
              className="p-2 h-8 w-8 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {conversation.status === "closed" && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              This conversation has been closed. Contact your supervisor to reopen it.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
