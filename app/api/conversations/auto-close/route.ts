import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/service-role'

// API endpoint for auto-closing expired conversations
// This should be called by a cron job every 15 minutes or so
export async function POST(request: NextRequest) {
  try {
    // Verify this is called from a legitimate source (optional auth)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Call the stored function to close expired conversations
    const { data, error } = await supabase.rpc('close_expired_conversations')

    if (error) {
      console.error('Error closing expired conversations:', error)
      return NextResponse.json(
        { error: 'Failed to close expired conversations' },
        { status: 500 }
      )
    }

    const closedCount = data || 0

    console.log(`✅ Auto-closed ${closedCount} expired conversations`)

    return NextResponse.json({
      success: true,
      closedCount,
      message: `Successfully closed ${closedCount} expired conversations`
    })

  } catch (error) {
    console.error('Error in auto-close endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for checking conversation window status
export async function GET() {
  try {
    const supabase = createClient()

    // Get conversations that are about to expire (within 1 hour)
    const { data: expiringSoon, error: expiringSoonError } = await supabase
      .from('conversations')
      .select(`
        id,
        status,
        conversation_window_expires_at,
        is_within_window,
        contacts (
          name,
          phone_number
        )
      `)
      .gte('conversation_window_expires_at', new Date().toISOString())
      .lte('conversation_window_expires_at', new Date(Date.now() + 60 * 60 * 1000).toISOString())
      .eq('status', 'open')

    if (expiringSoonError) {
      throw expiringSoonError
    }

    // Get conversations that are already expired but not closed
    const { data: alreadyExpired, error: expiredError } = await supabase
      .from('conversations')
      .select(`
        id,
        status,
        conversation_window_expires_at,
        is_within_window,
        contacts (
          name,
          phone_number
        )
      `)
      .lt('conversation_window_expires_at', new Date().toISOString())
      .neq('status', 'closed')
      .not('conversation_window_expires_at', 'is', null)

    if (expiredError) {
      throw expiredError
    }

    return NextResponse.json({
      success: true,
      expiringSoon: expiringSoon || [],
      alreadyExpired: alreadyExpired || [],
      summary: {
        expiringSoonCount: expiringSoon?.length || 0,
        alreadyExpiredCount: alreadyExpired?.length || 0
      }
    })

  } catch (error) {
    console.error('Error checking conversation windows:', error)
    return NextResponse.json(
      { error: 'Failed to check conversation windows' },
      { status: 500 }
    )
  }
}