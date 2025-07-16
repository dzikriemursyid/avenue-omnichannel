"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface Message {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  message_type: "text" | "image" | "document" | "audio" | "video";
  content: string;
  media_url?: string;
  media_content_type?: string;
  timestamp: string;
  sent_by?: string;
  profiles?: {
    full_name: string;
  };
}

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  profile_picture_url?: string;
}

interface Conversation {
  id: string;
  status: "open" | "pending" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  last_message_at: string;
  created_at: string;
  contact: Contact;
}

interface ChatData {
  conversation: Conversation;
  messages: Message[];
}

interface SendMessageData {
  message: string;
  message_type?: "text" | "image" | "document" | "audio" | "video";
  media_url?: string;
}

// Helper function to get content type from message type
const getContentTypeFromMessageType = (messageType: string): string => {
  switch (messageType) {
    case "image": return "image/jpeg";
    case "video": return "video/mp4";
    case "audio": return "audio/mpeg";
    case "document": return "application/pdf";
    default: return "text/plain";
  }
};

export function useChat(conversationId: string) {
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversation and messages
  const fetchChat = useCallback(async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/send`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat: ${response.statusText}`);
      }

      const data = await response.json();
      setChatData(data);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Send a message
  const sendMessage = useCallback(async (messageData: SendMessageData) => {
    if (!conversationId || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const result = await response.json();
      
      // Add the new message to local state for immediate UI update
      if (chatData && result.message) {
        const newMessage: Message = {
          id: result.message.id,
          conversation_id: conversationId,
          direction: "outbound",
          message_type: result.message.message_type,
          content: result.message.content,
          media_url: messageData.media_url,
          media_content_type: messageData.media_url ? getContentTypeFromMessageType(result.message.message_type) : undefined,
          timestamp: result.message.timestamp,
          sent_by: result.message.sent_by,
        };

        setChatData(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage],
          conversation: {
            ...prev.conversation,
            last_message_at: result.message.timestamp,
          }
        } : null);
      }

      toast.success("Message sent successfully");
      return result;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to send message");
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [conversationId, isSending, chatData]);

  // Add a new message to the chat (for real-time updates)
  const addMessage = useCallback((message: Message) => {
    setChatData(prev => prev ? {
      ...prev,
      messages: [...prev.messages, message],
      conversation: {
        ...prev.conversation,
        last_message_at: message.timestamp,
      }
    } : null);
  }, []);

  // Update message status (for delivery/read receipts)
  const updateMessageStatus = useCallback((messageSid: string, status: string) => {
    setChatData(prev => {
      if (!prev) return null;
      
      // For now, we don't store status in the messages table
      // This could be extended later for delivery/read receipts
      return prev;
    });
  }, []);

  return {
    chatData,
    messages: chatData?.messages || [],
    conversation: chatData?.conversation,
    isLoading,
    isSending,
    error,
    fetchChat,
    sendMessage,
    addMessage,
    updateMessageStatus,
  };
}