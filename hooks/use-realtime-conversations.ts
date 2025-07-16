"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type Conversation = Database['public']['Tables']['conversations']['Row']

interface UseRealtimeConversationsProps {
  onConversationUpdate?: (conversation: Conversation) => void
  onNewConversation?: (conversation: Conversation) => void
}

export function useRealtimeConversations({ 
  onConversationUpdate,
  onNewConversation 
}: UseRealtimeConversationsProps = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const supabase = createClient()

  // Memoize callbacks to prevent re-renders
  const handleConversationUpdate = useCallback((payload: any) => {
    console.log('📝 Conversation updated:', payload.new)
    const updatedConversation = payload.new as Conversation
    if (onConversationUpdate) {
      onConversationUpdate(updatedConversation)
    }
  }, [onConversationUpdate])

  const handleNewConversation = useCallback((payload: any) => {
    console.log('🆕 New conversation:', payload.new)
    const newConversation = payload.new as Conversation
    if (onNewConversation) {
      onNewConversation(newConversation)
    }
  }, [onNewConversation])

  useEffect(() => {
    console.log('🔄 Setting up realtime subscription for conversations')

    // Create channel for conversations
    const realtimeChannel = supabase
      .channel(`conversations-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        handleNewConversation
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        handleConversationUpdate
      )
      .subscribe((status) => {
        console.log(`📡 Conversations realtime status: ${status}`)
        setIsConnected(status === 'SUBSCRIBED')
      })

    setChannel(realtimeChannel)

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Cleaning up conversations realtime subscription')
      if (realtimeChannel) {
        realtimeChannel.unsubscribe()
      }
    }
  }, [handleConversationUpdate, handleNewConversation, supabase])

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