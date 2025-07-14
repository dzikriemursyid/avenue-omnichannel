#!/usr/bin/env node

// Fix Campaign Completion Issues
require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://gklucannjdfarwvnaafs.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbHVjYW5uamRmYXJ3dm5hYWZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI2NjEzOSwiZXhwIjoyMDY2ODQyMTM5fQ.c7bQPvXVbAWt0Dd55lhl6lzbWavWwuaDyoVnNiIoA8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixCampaignCompletion() {
    console.log('🔧 Fixing Campaign Completion Issues\n');

    try {
        // 1. Find running campaigns
        console.log('1. Finding running campaigns...');
        const { data: runningCampaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select('id, name, target_segments')
            .eq('status', 'running');

        if (campaignsError) {
            console.error('❌ Error fetching campaigns:', campaignsError);
            return;
        }

        console.log(`✅ Found ${runningCampaigns.length} running campaigns`);

        for (const campaign of runningCampaigns) {
            console.log(`\n🔍 Analyzing campaign: ${campaign.name} (${campaign.id})`);

            // Get expected contacts for this campaign
            const { data: expectedContacts, error: contactsError } = await supabase
                .from('contacts')
                .select('id, name, phone_number')
                .in('group_id', campaign.target_segments);

            if (contactsError) {
                console.error('❌ Error fetching expected contacts:', contactsError);
                continue;
            }

            console.log(`📊 Expected contacts: ${expectedContacts.length}`);
            expectedContacts.forEach(contact => {
                console.log(`   - ${contact.name} (${contact.phone_number})`);
            });

            // Get actual campaign messages
            const { data: campaignMessages, error: messagesError } = await supabase
                .from('campaign_messages')
                .select('contact_id, phone_number, status, error_message, message_sid')
                .eq('campaign_id', campaign.id);

            if (messagesError) {
                console.error('❌ Error fetching campaign messages:', messagesError);
                continue;
            }

            console.log(`📧 Actual messages sent: ${campaignMessages.length}`);
            campaignMessages.forEach(message => {
                console.log(`   - ${message.phone_number}: ${message.status} ${message.error_message ? `(Error: ${message.error_message})` : ''}`);
            });

            // Find missing contacts
            const sentContactIds = campaignMessages.map(msg => msg.contact_id);
            const missingContacts = expectedContacts.filter(contact => !sentContactIds.includes(contact.id));

            if (missingContacts.length > 0) {
                console.log(`❌ Missing messages for ${missingContacts.length} contacts:`);
                missingContacts.forEach(contact => {
                    console.log(`   - ${contact.name} (${contact.phone_number}) - ID: ${contact.id}`);
                });

                // Optionally create missing messages manually
                console.log('🔧 Creating missing campaign messages...');
                for (const contact of missingContacts) {
                    const { error: insertError } = await supabase
                        .from('campaign_messages')
                        .insert({
                            campaign_id: campaign.id,
                            contact_id: contact.id,
                            phone_number: contact.phone_number,
                            status: 'pending',
                            sent_at: new Date().toISOString()
                        });

                    if (insertError) {
                        console.error(`❌ Error creating message for ${contact.name}:`, insertError);
                    } else {
                        console.log(`✅ Created pending message for ${contact.name}`);
                    }
                }
            }

            // Check if campaign should be completed
            const totalExpected = expectedContacts.length;
            const totalProcessed = campaignMessages.filter(msg =>
                msg.status === 'delivered' || msg.status === 'failed' || msg.status === 'read'
            ).length;
            const totalSent = campaignMessages.filter(msg =>
                msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read'
            ).length;

            console.log(`📈 Campaign progress:`);
            console.log(`   Expected: ${totalExpected}`);
            console.log(`   Sent: ${totalSent}`);
            console.log(`   Processed (delivered/failed/read): ${totalProcessed}`);

            // Update campaign status if needed
            if (totalSent >= totalExpected) {
                if (totalProcessed >= totalExpected) {
                    console.log('✅ Campaign should be completed - updating status...');
                    await updateCampaignStatus(campaign.id, 'completed');
                } else {
                    console.log('⏳ Campaign sent but waiting for delivery confirmations...');
                }
            } else {
                console.log('⚠️ Campaign incomplete - not all contacts received messages');
            }

            // Update campaign analytics
            await updateCampaignAnalytics(campaign.id);
        }

        console.log('\n🎉 Campaign fix complete!');

    } catch (error) {
        console.error('❌ Fix error:', error);
    }
}

async function updateCampaignStatus(campaignId, status) {
    const { error } = await supabase
        .from('campaigns')
        .update({
            status: status,
            updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

    if (error) {
        console.error('❌ Error updating campaign status:', error);
    } else {
        console.log(`✅ Campaign status updated to: ${status}`);
    }
}

async function updateCampaignAnalytics(campaignId) {
    console.log('📊 Updating campaign analytics...');

    // Get message counts
    const { data: stats } = await supabase
        .from('campaign_messages')
        .select('status')
        .eq('campaign_id', campaignId);

    if (!stats) {
        console.log('⚠️ No campaign messages found for analytics');
        return;
    }

    const counts = stats.reduce((acc, msg) => {
        acc[msg.status] = (acc[msg.status] || 0) + 1;
        return acc;
    }, {});

    const totalSent = stats.length;
    const totalDelivered = counts.delivered || 0;
    const totalRead = counts.read || 0;
    const totalFailed = counts.failed || 0;

    // Calculate rates
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100 * 100) / 100 : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100 * 100) / 100 : 0;

    console.log('📈 Analytics update:', {
        totalSent,
        totalDelivered,
        totalRead,
        totalFailed,
        deliveryRate: `${deliveryRate}%`,
        readRate: `${readRate}%`
    });

    // Update analytics
    const { error } = await supabase
        .from('campaign_analytics')
        .upsert({
            campaign_id: campaignId,
            total_sent: totalSent,
            total_delivered: totalDelivered,
            total_read: totalRead,
            total_failed: totalFailed,
            delivery_rate: deliveryRate,
            read_rate: readRate,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('❌ Error updating analytics:', error);
    } else {
        console.log('✅ Analytics updated successfully');
    }
}

// Run the fix
fixCampaignCompletion().then(() => {
    console.log('\n🎉 Fix complete!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
}); 