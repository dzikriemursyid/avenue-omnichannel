"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

interface Conversation {
  id: string;
  contact_name: string;
  phone_number: string;
  profile_picture_url?: string;
  last_message: string;
  last_message_at: string;
  status: "open" | "pending" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  unread_count: number;
  created_at: string;
  is_within_window?: boolean;
  conversation_window_expires_at?: string;
  last_customer_message_at?: string;
  visibility_status?: "active" | "dormant";
  created_by_campaign?: string;
}

interface ConversationStats {
  open: number;
  pending: number;
  closed: number;
  total_unread: number;
}

interface ConversationsData {
  conversations: Conversation[];
  total: number;
  stats: ConversationStats;
}

export function useConversations() {
  const [data, setData] = useState<ConversationsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/conversations");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Refresh conversations
  const refresh = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Add a new conversation to the list (for real-time updates)
  const addConversation = useCallback((conversation: Conversation) => {
    setData(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        conversations: [conversation, ...prev.conversations],
        total: prev.total + 1,
        stats: {
          ...prev.stats,
          [conversation.status]: prev.stats[conversation.status] + 1,
          total_unread: prev.stats.total_unread + conversation.unread_count,
        }
      };
    });
  }, []);

  // Update conversation in the list
  const updateConversation = useCallback((conversationId: string, updates: Partial<Conversation>) => {
    setData(prev => {
      if (!prev) return null;
      
      const updatedConversations = prev.conversations.map(conv => 
        conv.id === conversationId ? { ...conv, ...updates } : conv
      );

      // Recalculate stats
      const stats = {
        open: updatedConversations.filter(c => c.status === "open").length,
        pending: updatedConversations.filter(c => c.status === "pending").length,
        closed: updatedConversations.filter(c => c.status === "closed").length,
        total_unread: updatedConversations.reduce((sum, c) => sum + c.unread_count, 0),
      };

      return {
        ...prev,
        conversations: updatedConversations,
        stats,
      };
    });
  }, []);

  return {
    conversations: data?.conversations || [],
    stats: data?.stats || { open: 0, pending: 0, closed: 0, total_unread: 0 },
    total: data?.total || 0,
    isLoading,
    error,
    fetchConversations,
    refresh,
    addConversation,
    updateConversation,
  };
}