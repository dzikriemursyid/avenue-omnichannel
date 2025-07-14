#!/usr/bin/env node

// Debug Campaign Send Issues
require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://gklucannjdfarwvnaafs.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbHVjYW5uamRmYXJ3dm5hYWZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI2NjEzOSwiZXhwIjoyMDY2ODQyMTM5fQ.c7bQPvXVbAWt0Dd55lhl6lzbWavWwuaDyoVnNiIoA8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debugCampaignSend() {
    console.log('🔍 Debugging Campaign Send Issues\n');

    try {
        // 1. Check campaigns
        console.log('1. Checking campaigns...');
        const { data: campaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select(`
        id,
        name,
        status,
        template_id,
        target_segments,
        created_at
      `)
            .order('created_at', { ascending: false })
            .limit(5);

        if (campaignsError) {
            console.error('❌ Error fetching campaigns:', campaignsError);
            return;
        }

        console.log(`✅ Found ${campaigns.length} campaigns:`);
        campaigns.forEach(campaign => {
            console.log(`   - ${campaign.name} (${campaign.status}) - Template: ${campaign.template_id} - Segments: ${campaign.target_segments?.length || 0}`);
        });

        if (campaigns.length === 0) {
            console.log('❌ No campaigns found. Create a campaign first.');
            return;
        }

        // 2. Check templates
        console.log('\n2. Checking message templates...');
        const { data: templates, error: templatesError } = await supabase
            .from('message_templates')
            .select('id, name, status, template_id, variables')
            .order('created_at', { ascending: false })
            .limit(5);

        if (templatesError) {
            console.error('❌ Error fetching templates:', templatesError);
            return;
        }

        console.log(`✅ Found ${templates.length} templates:`);
        templates.forEach(template => {
            console.log(`   - ${template.name} (${template.status}) - Twilio ID: ${template.template_id}`);
        });

        // 3. Check contact groups
        console.log('\n3. Checking contact groups...');
        const { data: groups, error: groupsError } = await supabase
            .from('contact_groups')
            .select('id, name, contact_count')
            .order('name', { ascending: true });

        if (groupsError) {
            console.error('❌ Error fetching contact groups:', groupsError);
            return;
        }

        console.log(`✅ Found ${groups.length} contact groups:`);
        groups.forEach(group => {
            console.log(`   - ${group.name} (${group.contact_count} contacts) - ID: ${group.id}`);
        });

        // 4. Check contacts
        console.log('\n4. Checking contacts...');
        const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .select('id, name, phone_number, group_id')
            .order('created_at', { ascending: false })
            .limit(10);

        if (contactsError) {
            console.error('❌ Error fetching contacts:', contactsError);
            return;
        }

        console.log(`✅ Found ${contacts.length} contacts (showing latest 10):`);
        contacts.forEach(contact => {
            console.log(`   - ${contact.name || 'No name'} (${contact.phone_number}) - Group: ${contact.group_id || 'None'}`);
        });

        // 5. Test campaign contact retrieval
        console.log('\n5. Testing campaign contact retrieval...');
        if (campaigns.length > 0) {
            const testCampaign = campaigns[0];
            console.log(`Testing with campaign: ${testCampaign.name}`);

            if (testCampaign.target_segments && testCampaign.target_segments.length > 0) {
                console.log(`Campaign target segments: ${testCampaign.target_segments.join(', ')}`);

                // Get contacts for this campaign
                const { data: campaignContacts, error: campaignContactsError } = await supabase
                    .from('contacts')
                    .select('id, name, phone_number, group_id')
                    .in('group_id', testCampaign.target_segments);

                if (campaignContactsError) {
                    console.error('❌ Error fetching campaign contacts:', campaignContactsError);
                } else {
                    console.log(`✅ Found ${campaignContacts.length} contacts for campaign:`);
                    campaignContacts.forEach(contact => {
                        console.log(`   - ${contact.name || 'No name'} (${contact.phone_number})`);
                    });

                    if (campaignContacts.length === 0) {
                        console.log('❌ No contacts found for this campaign!');
                        console.log('   This is why the campaign is not sending.');
                        console.log('   Possible issues:');
                        console.log('   1. Contacts are not assigned to the target groups');
                        console.log('   2. Target segments are incorrect');
                        console.log('   3. Group IDs don\'t match');
                    }
                }
            } else {
                console.log('❌ Campaign has no target segments!');
            }
        }

        // 6. Check Twilio configuration
        console.log('\n6. Checking Twilio configuration...');
        const twilioConfig = {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            fromNumber: process.env.TWILIO_FROM_NUMBER,
            webhookUrl: process.env.TWILIO_WEBHOOK_URL
        };

        console.log('Twilio config check:');
        console.log(`   Account SID: ${twilioConfig.accountSid ? '✅ Set' : '❌ Missing'}`);
        console.log(`   Auth Token: ${twilioConfig.authToken ? '✅ Set' : '❌ Missing'}`);
        console.log(`   From Number: ${twilioConfig.fromNumber ? '✅ Set' : '❌ Missing'}`);
        console.log(`   Webhook URL: ${twilioConfig.webhookUrl ? '✅ Set' : '❌ Missing'}`);

        // 7. Recommendations
        console.log('\n7. Recommendations:');
        console.log('   If campaigns are not sending, check:');
        console.log('   1. ✅ Campaign has target segments (contact groups)');
        console.log('   2. ✅ Contact groups have contacts assigned');
        console.log('   3. ✅ Template is approved and has correct Twilio ID');
        console.log('   4. ✅ Twilio credentials are properly configured');
        console.log('   5. ✅ Phone numbers are in correct format (+628xxx)');

    } catch (error) {
        console.error('❌ Debug error:', error);
    }
}

// Run the debug
debugCampaignSend().then(() => {
    console.log('\n🎉 Debug complete!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
}); 