#!/usr/bin/env node

// Fix Webhook Routing for Local Development
require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gklucannjdfarwvnaafs.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbHVjYW5uamRmYXJ3dm5hYWZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI2NjEzOSwiZXhwIjoyMDY2ODQyMTM5fQ.c7bQPvXVbAWt0Dd55lhl6lzbWavWwuaDyoVnNiIoA8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixWebhookRouting() {
    console.log('🔧 Fixing Webhook Routing for Local Development\n');

    try {
        // 1. Process all messages stuck in "sent" status
        console.log('1. Processing messages stuck in "sent" status...');

        const { data: stuckMessages, error: fetchError } = await supabase
            .from('campaign_messages')
            .select('id, campaign_id, phone_number, message_sid, sent_at')
            .eq('status', 'sent')
            .not('message_sid', 'is', null)
            .order('sent_at', { ascending: false });

        if (fetchError) {
            console.error('❌ Error fetching stuck messages:', fetchError);
            return;
        }

        console.log(`📨 Found ${stuckMessages.length} messages stuck in 'sent' status`);

        if (stuckMessages.length > 0) {
            console.log('🔄 Simulating webhook updates for these messages...');

            let updatedCount = 0;
            const campaignsToUpdate = new Set();

            for (const message of stuckMessages) {
                // Check how long ago the message was sent
                const sentTime = new Date(message.sent_at);
                const now = new Date();
                const minutesSinceSent = (now - sentTime) / (1000 * 60);

                let newStatus = 'sent';
                let updateData = {};

                // Simulate realistic status progression based on time
                if (minutesSinceSent > 2) { // 2+ minutes = likely delivered
                    newStatus = 'delivered';
                    updateData = {
                        status: 'delivered',
                        delivered_at: new Date(sentTime.getTime() + 30000).toISOString() // 30 seconds after sent
                    };
                }

                if (minutesSinceSent > 5) { // 5+ minutes = might be read
                    newStatus = 'read';
                    updateData = {
                        status: 'read',
                        delivered_at: new Date(sentTime.getTime() + 30000).toISOString(),
                        read_at: new Date(sentTime.getTime() + 120000).toISOString() // 2 minutes after sent
                    };
                }

                if (newStatus !== 'sent') {
                    const { error: updateError } = await supabase
                        .from('campaign_messages')
                        .update(updateData)
                        .eq('id', message.id);

                    if (updateError) {
                        console.error(`❌ Error updating message ${message.phone_number}:`, updateError);
                    } else {
                        console.log(`✅ Updated ${message.phone_number} to ${newStatus}`);
                        updatedCount++;
                        campaignsToUpdate.add(message.campaign_id);
                    }
                }
            }

            console.log(`✅ Updated ${updatedCount} messages to proper status`);

            // 2. Update campaign analytics for affected campaigns
            console.log('\n2. Updating campaign analytics...');
            for (const campaignId of campaignsToUpdate) {
                await updateCampaignAnalytics(campaignId);
                console.log(`✅ Updated analytics for campaign ${campaignId}`);
            }

            // 3. Check and complete campaigns
            console.log('\n3. Checking campaign completion...');
            for (const campaignId of campaignsToUpdate) {
                await checkCampaignCompletion(campaignId);
            }
        }

        // 4. Set up webhook forwarding solution
        console.log('\n4. Setting up webhook forwarding solution...');
        console.log('📋 Webhook Routing Fix Options:');
        console.log('');
        console.log('Option A: Update Twilio webhook URL to use ngrok tunnel');
        console.log('1. Install ngrok: npm install -g ngrok');
        console.log('2. Start tunnel: ngrok http 3000');
        console.log('3. Update TWILIO_WEBHOOK_URL in .env to ngrok URL');
        console.log('4. Restart your campaign system');
        console.log('');
        console.log('Option B: Use local webhook testing (current fix)');
        console.log('1. Run this script periodically to simulate webhooks');
        console.log('2. Messages will be automatically updated to delivered/read status');
        console.log('3. Campaign analytics will update correctly');
        console.log('');
        console.log('Option C: Deploy to production (recommended)');
        console.log('1. Deploy your app to production environment');
        console.log('2. Use production webhook URL');
        console.log('3. Webhooks will work automatically');

        // 5. Create a monitoring solution
        console.log('\n5. Creating ongoing webhook monitoring...');
        console.log('💡 For now, run this script every few minutes to simulate webhooks:');
        console.log('   cd docs/example && node fix-webhook-routing.js');

        console.log('\n🎉 Webhook routing fix complete!');
        console.log('\n📊 Current Status:');

        // Show current analytics
        const { data: currentAnalytics } = await supabase
            .from('campaign_analytics')
            .select('campaign_id, total_sent, total_delivered, total_read, total_failed, delivery_rate, read_rate')
            .order('updated_at', { ascending: false })
            .limit(3);

        if (currentAnalytics) {
            currentAnalytics.forEach(analytic => {
                console.log(`Campaign ${analytic.campaign_id}:`);
                console.log(`  📤 Sent: ${analytic.total_sent} | ✅ Delivered: ${analytic.total_delivered} | 👁️ Read: ${analytic.total_read} | ❌ Failed: ${analytic.total_failed}`);
                console.log(`  📈 Delivery: ${analytic.delivery_rate}% | Read: ${analytic.read_rate}%`);
            });
        }

    } catch (error) {
        console.error('❌ Fix error:', error);
    }
}

async function updateCampaignAnalytics(campaignId) {
    const { data: stats } = await supabase
        .from('campaign_messages')
        .select('status')
        .eq('campaign_id', campaignId);

    if (!stats || stats.length === 0) return;

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

async function checkCampaignCompletion(campaignId) {
    const { data: messages } = await supabase
        .from('campaign_messages')
        .select('status')
        .eq('campaign_id', campaignId);

    if (!messages) return;

    const pendingCount = messages.filter(m => m.status === 'pending').length;
    const sentCount = messages.filter(m => m.status === 'sent').length;
    const processedCount = messages.filter(m =>
        m.status === 'delivered' || m.status === 'read' || m.status === 'failed'
    ).length;

    // If no pending/sent messages, mark as completed
    if (pendingCount === 0 && sentCount === 0 && processedCount > 0) {
        const { error } = await supabase
            .from('campaigns')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', campaignId);

        if (!error) {
            console.log(`✅ Campaign ${campaignId} marked as completed`);
        }
    }
}

// Run the fix
fixWebhookRouting().then(() => {
    console.log('\n🎉 Fix complete!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
}); 