"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type Message = Database['public']['Tables']['messages']['Row']

interface UseRealtimeMessagesProps {
  conversationId: string
  onNewMessage?: (message: Message) => void
  onMessageUpdate?: (message: Message) => void
  onMessageDelete?: (messageId: string) => void
}

export function useRealtimeMessages({ 
  conversationId, 
  onNewMessage, 
  onMessageUpdate,
  onMessageDelete 
}: UseRealtimeMessagesProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const supabase = createClient()

  // Memoize callbacks to prevent re-renders
  const handleNewMessage = useCallback((payload: any) => {
    console.log('📨 New message received:', payload.new)
    const newMessage = payload.new as Message
    if (onNewMessage) {
      onNewMessage(newMessage)
    }
  }, [onNewMessage])

  const handleMessageUpdate = useCallback((payload: any) => {
    console.log('📝 Message updated:', payload.new)
    const updatedMessage = payload.new as Message
    if (onMessageUpdate) {
      onMessageUpdate(updatedMessage)
    }
  }, [onMessageUpdate])

  const handleMessageDelete = useCallback((payload: any) => {
    console.log('🗑️ Message deleted:', payload.old)
    const deletedMessage = payload.old as Message
    if (onMessageDelete && deletedMessage.id) {
      onMessageDelete(deletedMessage.id)
    }
  }, [onMessageDelete])

  useEffect(() => {
    if (!conversationId) return

    console.log(`🔄 Setting up realtime subscription for conversation: ${conversationId}`)

    // Create channel for this conversation
    const realtimeChannel = supabase
      .channel(`messages-${conversationId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        handleNewMessage
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        handleMessageUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        handleMessageDelete
      )
      .subscribe((status) => {
        console.log(`📡 Realtime status: ${status}`)
        setIsConnected(status === 'SUBSCRIBED')
      })

    setChannel(realtimeChannel)

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Cleaning up realtime subscription')
      if (realtimeChannel) {
        realtimeChannel.unsubscribe()
      }
    }
  }, [conversationId, handleNewMessage, handleMessageUpdate, handleMessageDelete, supabase])

  // Function to manually disconnect
  const disconnect = () => {
    if (channel) {
      channel.unsubscribe()
      setChannel(null)
      setIsConnected(false)
    }
  }

  return {
    isConnected,
    disconnect
  }
}