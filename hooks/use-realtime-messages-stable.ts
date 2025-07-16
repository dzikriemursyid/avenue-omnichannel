"use client"

import { useEffect, useState, useRef } from 'react'
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

export function useRealtimeMessagesStable({ 
  conversationId, 
  onNewMessage, 
  onMessageUpdate,
  onMessageDelete 
}: UseRealtimeMessagesProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const supabase = createClient()
  
  // Use refs to store callbacks to prevent dependency changes
  const onNewMessageRef = useRef(onNewMessage)
  const onMessageUpdateRef = useRef(onMessageUpdate)
  const onMessageDeleteRef = useRef(onMessageDelete)
  
  // Update refs when callbacks change
  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])
  
  useEffect(() => {
    onMessageUpdateRef.current = onMessageUpdate
  }, [onMessageUpdate])
  
  useEffect(() => {
    onMessageDeleteRef.current = onMessageDelete
  }, [onMessageDelete])

  useEffect(() => {
    if (!conversationId) return

    console.log(`🔄 Setting up stable realtime subscription for conversation: ${conversationId}`)

    // Create channel for this conversation
    const realtimeChannel = supabase
      .channel(`messages-stable-${conversationId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('📨 New message received:', payload.new)
          const newMessage = payload.new as Message
          if (onNewMessageRef.current) {
            onNewMessageRef.current(newMessage)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('📝 Message updated:', payload.new)
          const updatedMessage = payload.new as Message
          if (onMessageUpdateRef.current) {
            onMessageUpdateRef.current(updatedMessage)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('🗑️ Message deleted:', payload.old)
          const deletedMessage = payload.old as Message
          if (onMessageDeleteRef.current && deletedMessage.id) {
            onMessageDeleteRef.current(deletedMessage.id)
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Realtime status: ${status}`)
        setIsConnected(status === 'SUBSCRIBED')
      })

    setChannel(realtimeChannel)

    // Cleanup subscription on unmount or conversationId change
    return () => {
      console.log('🔌 Cleaning up stable realtime subscription')
      if (realtimeChannel) {
        realtimeChannel.unsubscribe()
      }
    }
  }, [conversationId, supabase]) // Only depend on conversationId and supabase

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