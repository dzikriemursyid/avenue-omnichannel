"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useChat } from "@/hooks/use-chat"
import { useRealtimeMessagesStable } from "@/hooks/use-realtime-messages-stable"
import { MediaPreview } from "@/components/chat/media-preview"
import { FileUploadButton, SelectedFilePreview } from "@/components/chat/file-upload-button"
import type { UploadResult } from "@/components/chat/file-upload-button"
import { TypingIndicator, useTypingIndicator } from "@/components/chat/typing-indicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { X } from "lucide-react"
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
  created_at: Date
  last_message_at: Date
  is_within_window?: boolean
  conversation_window_expires_at?: Date
  last_customer_message_at?: Date
}

interface ChatRoomProps {
  conversationId: string
  currentUser: UserProfile
}

export function ChatRoom({ conversationId, currentUser }: ChatRoomProps) {
  const [newMessage, setNewMessage] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedMedia, setUploadedMedia] = useState<UploadResult | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { chatData, messages, conversation, isLoading, isSending, fetchChat, sendMessage } = useChat(conversationId)
  const { isTyping, startTyping, stopTyping } = useTypingIndicator(conversationId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    fetchChat()
  }, [fetchChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Setup stable realtime subscription for live message updates
  useRealtimeMessagesStable({
    conversationId,
    onNewMessage: (newMessage) => {
      console.log('🔔 Received new message via realtime:', newMessage)
      // Only add message if it's not from current user sending
      if (newMessage.sent_by !== currentUser.id) {
        // Refresh chat data to get the new message with proper formatting
        fetchChat()
      }
    },
    onMessageUpdate: (updatedMessage) => {
      console.log('📝 Message updated via realtime:', updatedMessage)
      // Refresh chat data to reflect updates
      fetchChat()
    }
  })

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !uploadedMedia) || isSending) return

    try {
      let messageData;
      
      if (uploadedMedia) {
        // Send uploaded media message
        messageData = {
          message: newMessage.trim() || `📎 ${uploadedMedia.originalName}`,
          message_type: uploadedMedia.messageType,
          media_url: uploadedMedia.url,
          media_content_type: uploadedMedia.type
        };
      } else {
        messageData = {
          message: newMessage.trim(),
          message_type: "text"
        };
      }
      
      await sendMessage(messageData);
      setNewMessage("");
      setSelectedFile(null);
      setUploadedMedia(null);
      inputRef.current?.focus();
    } catch (error) {
      // Error is already handled by the hook with toast
      console.error("Failed to send message:", error)
    }
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <p className="text-muted-foreground">Conversation not found</p>
        </div>
      </div>
    )
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
              {/* Window status badge */}
              {conversation.is_within_window ? (
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                  📱 Active
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  ⏰ Expired
                </Badge>
              )}
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
                new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 5 * 60 * 1000 // 5 minutes

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
                        {/* Media Preview */}
                        {message.media_url && message.media_content_type && (
                          <div className="mb-2">
                            <MediaPreview
                              mediaUrl={message.media_url}
                              mediaContentType={message.media_content_type}
                              className="max-w-full"
                              messageId={message.id}
                            />
                          </div>
                        )}
                        
                        {/* Text Content */}
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                        
                        {/* Message Footer */}
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
            {/* Typing Indicator - for remote users typing */}
            <TypingIndicator 
              isVisible={false} // Will be true when remote user is typing
              userName={conversation?.contact?.name || "Contact"}
              className="mx-4"
            />
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Message Input */}
      <Card className="rounded-t-none border-t-0">
        <CardContent className="p-4">
          <div className="space-y-2">
            {selectedFile && !uploadedMedia && (
              <SelectedFilePreview
                file={selectedFile}
                onRemove={() => setSelectedFile(null)}
              />
            )}
            {uploadedMedia && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md max-w-xs">
                <div className="flex-shrink-0 text-green-600">
                  ✅
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800 truncate">{uploadedMedia.originalName}</p>
                  <p className="text-xs text-green-600">Ready to send</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0 text-green-600 hover:text-green-800"
                  onClick={() => setUploadedMedia(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <FileUploadButton
                onFileSelect={(file) => setSelectedFile(file)}
                onFileUploaded={(result) => {
                  setUploadedMedia(result);
                  setSelectedFile(null);
                }}
                disabled={conversation.status === "closed"}
                conversationId={conversationId}
                autoUpload={true}
              />
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  // Start typing indicator when user types
                  if (e.target.value.trim() && !isTyping) {
                    startTyping()
                  } else if (!e.target.value.trim() && isTyping) {
                    stopTyping()
                  }
                }}
                onKeyPress={handleKeyPress}
                onBlur={stopTyping}
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
                disabled={(!newMessage.trim() && !uploadedMedia) || conversation.status === "closed" || isSending}
                size="sm"
                className="p-2 h-8 w-8 flex-shrink-0"
              >
              {isSending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              </Button>
            </div>
          </div>
          {conversation.status === "closed" && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-700 text-center font-medium">
                🚫 This conversation has been closed (24-hour window expired)
              </p>
              <p className="text-xs text-red-600 text-center mt-1">
                Customer must send a new message to reopen the conversation
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
