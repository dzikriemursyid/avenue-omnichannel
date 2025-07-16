#!/usr/bin/env node

/**
 * Test script for conversation window logic
 * This script helps test the 24-hour conversation window functionality
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConversationWindow() {
  console.log('🧪 Testing Conversation Window Logic\n');

  try {
    // 1. Test auto-close function
    console.log('1️⃣ Testing auto-close function...');
    const { data: closedCount, error: closeError } = await supabase.rpc('close_expired_conversations');
    
    if (closeError) {
      console.error('❌ Error calling close_expired_conversations:', closeError);
    } else {
      console.log(`✅ Auto-closed ${closedCount} expired conversations\n`);
    }

    // 2. Check conversation window statuses
    console.log('2️⃣ Checking conversation window statuses...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        status,
        is_within_window,
        conversation_window_expires_at,
        last_customer_message_at,
        contacts (
          name,
          phone_number
        )
      `)
      .order('last_customer_message_at', { ascending: false, nullsFirst: false });

    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }

    console.log(`Found ${conversations.length} conversations:\n`);
    
    conversations.forEach((conv, index) => {
      const isExpired = conv.conversation_window_expires_at && new Date(conv.conversation_window_expires_at) < new Date();
      const timeRemaining = conv.conversation_window_expires_at 
        ? Math.max(0, Math.floor((new Date(conv.conversation_window_expires_at) - new Date()) / (1000 * 60 * 60)))
        : 'N/A';
      
      console.log(`${index + 1}. ${conv.contacts?.name || 'Unknown'} (${conv.contacts?.phone_number || 'No phone'})`);
      console.log(`   Status: ${conv.status}`);
      console.log(`   Within Window: ${conv.is_within_window ? '✅' : '❌'}`);
      console.log(`   Window Expires: ${conv.conversation_window_expires_at || 'Not set'}`);
      console.log(`   Time Remaining: ${timeRemaining} hours`);
      console.log(`   Last Customer Message: ${conv.last_customer_message_at || 'Never'}`);
      
      if (isExpired && conv.status !== 'closed') {
        console.log(`   ⚠️  SHOULD BE CLOSED - Window expired but status is still ${conv.status}`);
      }
      
      console.log('');
    });

    // 3. Test API endpoint
    console.log('3️⃣ Testing auto-close API endpoint...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/conversations/auto-close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API endpoint response:', result);
      } else {
        console.log(`❌ API endpoint failed: ${response.status} ${response.statusText}`);
      }
    } catch (apiError) {
      console.log('❌ Error calling API endpoint:', apiError.message);
    }

    console.log('\n🏁 Test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run the SQL migration to set up the triggers');
    console.log('   2. Set up a cron job to call /api/conversations/auto-close every 15 minutes');
    console.log('   3. Test with real WhatsApp messages to verify the 24-hour window');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testConversationWindow();
}

module.exports = { testConversationWindow };