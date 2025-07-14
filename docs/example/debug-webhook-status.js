#!/usr/bin/env node

// Debug Webhook Status Updates
require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gklucannjdfarwvnaafs.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbHVjYW5uamRmYXJ3dm5hYWZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI2NjEzOSwiZXhwIjoyMDY2ODQyMTM5fQ.c7bQPvXVbAWt0Dd55lhl6lzbWavWwuaDyoVnNiIoA8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debugWebhookStatus() {
    console.log('🔍 Debugging Webhook Status Updates\n');

    try {
        // 1. Check recent campaign messages and their status
        console.log('1. Checking recent campaign messages...');
        const { data: recentMessages, error: messagesError } = await supabase
            .from('campaign_messages')
            .select('id, campaign_id, phone_number, status, message_sid, sent_at, delivered_at, read_at, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (messagesError) {
            console.error('❌ Error fetching messages:', messagesError);
            return;
        }

        console.log(`✅ Found ${recentMessages.length} recent messages:`);
        recentMessages.forEach(msg => {
            console.log(`   - ${msg.phone_number}: ${msg.status} (SID: ${msg.message_sid || 'None'})`);
            console.log(`     Sent: ${msg.sent_at || 'None'} | Delivered: ${msg.delivered_at || 'None'} | Read: ${msg.read_at || 'None'}`);
        });

        // 2. Check campaign analytics
        console.log('\n2. Checking campaign analytics...');
        const { data: analytics, error: analyticsError } = await supabase
            .from('campaign_analytics')
            .select('campaign_id, total_sent, total_delivered, total_read, total_failed, delivery_rate, read_rate, updated_at')
            .order('updated_at', { ascending: false })
            .limit(5);

        if (analyticsError) {
            console.error('❌ Error fetching analytics:', analyticsError);
        } else {
            console.log(`✅ Found ${analytics.length} analytics records:`);
            analytics.forEach(analytic => {
                console.log(`   Campaign ${analytic.campaign_id}:`);
                console.log(`     Sent: ${analytic.total_sent} | Delivered: ${analytic.total_delivered} | Read: ${analytic.total_read} | Failed: ${analytic.total_failed}`);
                console.log(`     Delivery Rate: ${analytic.delivery_rate}% | Read Rate: ${analytic.read_rate}%`);
                console.log(`     Updated: ${analytic.updated_at}`);
            });
        }

        // 3. Check for messages with Twilio SIDs but no delivery status
        console.log('\n3. Checking messages that should have received webhook updates...');
        const { data: sentWithSids, error: sidsError } = await supabase
            .from('campaign_messages')
            .select('id, campaign_id, phone_number, status, message_sid, sent_at, delivered_at, read_at')
            .not('message_sid', 'is', null)
            .eq('status', 'sent')
            .order('sent_at', { ascending: false })
            .limit(10);

        if (sidsError) {
            console.error('❌ Error fetching messages with SIDs:', sidsError);
        } else {
            console.log(`🔍 Found ${sentWithSids.length} messages with SIDs still in 'sent' status:`);
            if (sentWithSids.length > 0) {
                console.log('❌ These messages should have received webhook updates but haven\'t:');
                sentWithSids.forEach(msg => {
                    console.log(`   - ${msg.phone_number}: SID ${msg.message_sid} (sent at ${msg.sent_at})`);
                });
                console.log('\n💡 This indicates webhooks are not being received or processed correctly');
            } else {
                console.log('✅ No messages stuck in sent status');
            }
        }

        // 4. Test webhook processing manually for one message
        console.log('\n4. Testing manual webhook processing...');
        if (sentWithSids && sentWithSids.length > 0) {
            const testMessage = sentWithSids[0];
            console.log(`📤 Simulating webhook for message: ${testMessage.phone_number} (${testMessage.message_sid})`);

            // Simulate delivered status
            const { error: updateError } = await supabase
                .from('campaign_messages')
                .update({
                    status: 'delivered',
                    delivered_at: new Date().toISOString()
                })
                .eq('message_sid', testMessage.message_sid);

            if (updateError) {
                console.error('❌ Error updating message status:', updateError);
            } else {
                console.log('✅ Successfully updated message to delivered');

                // Update campaign analytics
                await updateCampaignAnalytics(testMessage.campaign_id);
                console.log('✅ Updated campaign analytics');
            }
        }

        // 5. Check webhook endpoint with test data
        console.log('\n5. Testing webhook endpoint directly...');
        const webhookUrl = process.env.TWILIO_WEBHOOK_URL;
        console.log(`Webhook URL: ${webhookUrl}`);

        if (webhookUrl && recentMessages.length > 0) {
            const testMessage = recentMessages[0];

            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        MessageSid: testMessage.message_sid || 'TEST_SID_123',
                        MessageStatus: 'delivered',
                        From: `whatsapp:+628979118504`,
                        To: `whatsapp:${testMessage.phone_number}`,
                        Body: 'Test webhook message',
                        ApiVersion: '2010-04-01',
                        AccountSid: process.env.TWILIO_ACCOUNT_SID || 'TEST_ACCOUNT'
                    })
                });

                if (response.ok) {
                    console.log('✅ Webhook endpoint responded successfully');
                    console.log(`   Response status: ${response.status}`);

                    // Check if the message was updated
                    setTimeout(async () => {
                        const { data: updatedMessage } = await supabase
                            .from('campaign_messages')
                            .select('status, delivered_at')
                            .eq('message_sid', testMessage.message_sid)
                            .single();

                        if (updatedMessage) {
                            console.log(`   Message status after webhook: ${updatedMessage.status}`);
                            console.log(`   Delivered at: ${updatedMessage.delivered_at || 'Not set'}`);
                        }
                    }, 2000);

                } else {
                    console.log(`❌ Webhook endpoint error: ${response.status} ${response.statusText}`);
                    const errorText = await response.text();
                    console.log(`   Error response: ${errorText}`);
                }
            } catch (error) {
                console.error('❌ Webhook test failed:', error.message);
                console.log('💡 Make sure your Next.js server is running: pnpm dev');
            }
        } else {
            console.log('⚠️ No webhook URL configured or no recent messages to test');
        }

        // 6. Database schema check
        console.log('\n6. Verifying database schema...');

        // Check if campaign_analytics table exists and has the right columns
        const { data: analyticsColumns, error: schemaError } = await supabase
            .rpc('get_table_columns', { table_name_param: 'campaign_analytics' })
            .catch(() => {
                // If RPC doesn't exist, try direct query
                return supabase
                    .from('campaign_analytics')
                    .select('*')
                    .limit(1);
            });

        if (!schemaError) {
            console.log('✅ campaign_analytics table exists');
        } else {
            console.log('❌ Issue with campaign_analytics table:', schemaError.message);
        }

        // Check campaign_messages table
        const { data: messagesColumns, error: messagesSchemaError } = await supabase
            .from('campaign_messages')
            .select('*')
            .limit(1);

        if (!messagesSchemaError) {
            console.log('✅ campaign_messages table exists');
        } else {
            console.log('❌ Issue with campaign_messages table:', messagesSchemaError.message);
        }

        console.log('\n📋 Summary:');
        console.log('- Check if webhooks are being sent by Twilio');
        console.log('- Verify webhook URL is publicly accessible');
        console.log('- Ensure Next.js server is running to receive webhooks');
        console.log('- Monitor server logs for webhook processing');

    } catch (error) {
        console.error('❌ Debug error:', error);
    }
}

async function updateCampaignAnalytics(campaignId) {
    const { data: stats } = await supabase
        .from('campaign_messages')
        .select('status')
        .eq('campaign_id', campaignId);

    if (!stats) return;

    const counts = stats.reduce((acc, msg) => {
        acc[msg.status] = (acc[msg.status] || 0) + 1;
        return acc;
    }, {});

    const totalSent = stats.length;
    const totalDelivered = counts.delivered || 0;
    const totalRead = counts.read || 0;
    const totalFailed = counts.failed || 0;

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100 * 100) / 100 : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100 * 100) / 100 : 0;

    await supabase
        .from('campaign_analytics')
        .update({
            total_sent: totalSent,
            total_delivered: totalDelivered,
            total_read: totalRead,
            total_failed: totalFailed,
            delivery_rate: deliveryRate,
            read_rate: readRate,
            updated_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId);
}

// Run the debug
debugWebhookStatus().then(() => {
    console.log('\n🎉 Debug complete!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
}); 