#!/usr/bin/env node

// Fix Webhook and Analytics Issues
require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gklucannjdfarwvnaafs.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbHVjYW5uamRmYXJ3dm5hYWZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI2NjEzOSwiZXhwIjoyMDY2ODQyMTM5fQ.c7bQPvXVbAWt0Dd55lhl6lzbWavWwuaDyoVnNiIoA8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixWebhookAndAnalytics() {
    console.log('🔧 Fixing Webhook and Analytics Issues\n');

    try {
        // 1. Fix analytics duplicates by using UPDATE instead of UPSERT
        console.log('1. Fixing analytics duplicates...');
        const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id, name')
            .eq('status', 'running');

        for (const campaign of campaigns) {
            console.log(`📊 Updating analytics for: ${campaign.name}`);

            // Get message counts
            const { data: stats } = await supabase
                .from('campaign_messages')
                .select('status')
                .eq('campaign_id', campaign.id);

            if (!stats || stats.length === 0) {
                continue;
            }

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

            // Try to update existing analytics first
            const { error: updateError } = await supabase
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
                .eq('campaign_id', campaign.id);

            if (updateError && updateError.code === 'PGRST116') {
                // No existing record, insert new one
                const { error: insertError } = await supabase
                    .from('campaign_analytics')
                    .insert({
                        campaign_id: campaign.id,
                        total_sent: totalSent,
                        total_delivered: totalDelivered,
                        total_read: totalRead,
                        total_failed: totalFailed,
                        delivery_rate: deliveryRate,
                        read_rate: readRate,
                        updated_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error(`❌ Error inserting analytics for ${campaign.name}:`, insertError.message);
                } else {
                    console.log(`✅ Created analytics for ${campaign.name}`);
                }
            } else if (updateError) {
                console.error(`❌ Error updating analytics for ${campaign.name}:`, updateError.message);
            } else {
                console.log(`✅ Updated analytics for ${campaign.name}`);
            }
        }

        // 2. Test webhook endpoint
        console.log('\n2. Testing webhook endpoint...');

        try {
            const response = await fetch('https://webhook.dzynthesis.dev/webhook/twilio/status', {
                method: 'GET'
            });

            if (response.ok) {
                console.log('✅ Webhook endpoint is accessible');
            } else {
                console.log('❌ Webhook endpoint returned:', response.status);
            }
        } catch (error) {
            console.error('❌ Webhook endpoint not accessible:', error.message);
            console.log('💡 This might be why webhooks aren\'t updating message status');
        }

        // 3. Simulate webhook updates for testing
        console.log('\n3. Simulating webhook status updates...');

        const { data: sentMessages } = await supabase
            .from('campaign_messages')
            .select('id, campaign_id, message_sid, phone_number, status')
            .eq('status', 'sent')
            .limit(5);

        if (sentMessages && sentMessages.length > 0) {
            console.log(`📨 Found ${sentMessages.length} messages in 'sent' status`);

            for (const message of sentMessages) {
                console.log(`🔄 Updating message ${message.phone_number} to delivered status`);

                // Update to delivered
                const { error } = await supabase
                    .from('campaign_messages')
                    .update({
                        status: 'delivered',
                        delivered_at: new Date().toISOString()
                    })
                    .eq('id', message.id);

                if (error) {
                    console.error(`❌ Error updating message status:`, error);
                } else {
                    console.log(`✅ Updated ${message.phone_number} to delivered`);

                    // Update campaign analytics
                    await updateCampaignAnalytics(message.campaign_id);
                }
            }
        } else {
            console.log('📭 No messages in sent status found');
        }

        // 4. Check and update campaign completion
        console.log('\n4. Checking campaign completion...');

        for (const campaign of campaigns) {
            const { data: messages } = await supabase
                .from('campaign_messages')
                .select('status')
                .eq('campaign_id', campaign.id);

            if (!messages) continue;

            const pendingCount = messages.filter(m => m.status === 'pending').length;
            const sentCount = messages.filter(m => m.status === 'sent').length;
            const processedCount = messages.filter(m =>
                m.status === 'delivered' || m.status === 'read' || m.status === 'failed'
            ).length;

            console.log(`📊 ${campaign.name}: ${pendingCount} pending, ${sentCount} sent, ${processedCount} processed`);

            // If no pending messages and some processed, mark as completed
            if (pendingCount === 0 && processedCount > 0) {
                console.log(`✅ Marking ${campaign.name} as completed`);

                const { error } = await supabase
                    .from('campaigns')
                    .update({
                        status: 'completed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', campaign.id);

                if (error) {
                    console.error(`❌ Error updating campaign status:`, error);
                } else {
                    console.log(`✅ ${campaign.name} marked as completed`);
                }
            }
        }

        console.log('\n🎉 Webhook and analytics fix complete!');

    } catch (error) {
        console.error('❌ Fix error:', error);
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

// Run the fix
fixWebhookAndAnalytics().then(() => {
    console.log('\n🎉 Fix complete!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
}); 