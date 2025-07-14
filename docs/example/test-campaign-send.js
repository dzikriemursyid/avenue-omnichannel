#!/usr/bin/env node

// Test Campaign Send Process
require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://gklucannjdfarwvnaafs.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrbHVjYW5uamRmYXJ3dm5hYWZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI2NjEzOSwiZXhwIjoyMDY2ODQyMTM5fQ.c7bQPvXVbAWt0Dd55lhl6lzbWavWwuaDyoVnNiIoA8o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testCampaignSend() {
    console.log('🧪 Testing Campaign Send Process\n');

    try {
        // 1. Find a campaign to test
        console.log('1. Finding test campaign...');
        const { data: campaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select('id, name, status, template_id, target_segments')
            .eq('status', 'running')
            .limit(1);

        if (campaignsError) {
            console.error('❌ Error fetching campaigns:', campaignsError);
            return;
        }

        if (!campaigns || campaigns.length === 0) {
            console.log('❌ No running campaigns found. Creating a test campaign...');
            await createTestCampaign();
            return;
        }

        const testCampaign = campaigns[0];
        console.log(`✅ Found test campaign: ${testCampaign.name} (${testCampaign.id})`);

        // 2. Simulate the campaign sending process
        console.log('\n2. Testing campaign send logic...');
        await simulateCampaignSend(testCampaign.id);

        // 3. Check campaign messages
        console.log('\n3. Checking campaign messages...');
        const { data: messages, error: messagesError } = await supabase
            .from('campaign_messages')
            .select('id, phone_number, status, error_message, message_sid, created_at')
            .eq('campaign_id', testCampaign.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (messagesError) {
            console.error('❌ Error fetching campaign messages:', messagesError);
        } else {
            console.log(`✅ Found ${messages.length} campaign messages:`);
            messages.forEach(msg => {
                console.log(`   - ${msg.phone_number}: ${msg.status} (SID: ${msg.message_sid || 'None'}) ${msg.error_message ? `- Error: ${msg.error_message}` : ''}`);
            });
        }

        // 4. Test manual send
        console.log('\n4. Testing manual campaign send via API...');
        await testManualSend(testCampaign.id);

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

async function simulateCampaignSend(campaignId) {
    console.log(`🔄 Simulating campaign send for: ${campaignId}`);

    try {
        // Step 1: Get campaign
        const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (campaignError || !campaign) {
            console.error('❌ Campaign not found:', campaignError);
            return;
        }

        console.log(`✅ Campaign found: ${campaign.name} (Status: ${campaign.status})`);

        // Step 2: Check template
        const { data: template, error: templateError } = await supabase
            .from('message_templates')
            .select('*')
            .eq('id', campaign.template_id)
            .single();

        if (templateError || !template) {
            console.error('❌ Template not found:', templateError);
            return;
        }

        console.log(`✅ Template found: ${template.name} (Status: ${template.status})`);
        console.log(`   Twilio ID: ${template.template_id}`);
        console.log(`   Variables: ${template.variables || 'None'}`);

        // Step 3: Get contacts
        if (!campaign.target_segments || campaign.target_segments.length === 0) {
            console.error('❌ Campaign has no target segments');
            return;
        }

        console.log(`🎯 Target segments: ${campaign.target_segments.join(', ')}`);

        const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .select('id, name, phone_number, group_id')
            .in('group_id', campaign.target_segments);

        if (contactsError) {
            console.error('❌ Error fetching contacts:', contactsError);
            return;
        }

        if (!contacts || contacts.length === 0) {
            console.error('❌ No contacts found for target segments');
            console.log('   Debugging contact group assignment...');

            // Debug: Check contact groups
            const { data: groups } = await supabase
                .from('contact_groups')
                .select('id, name, contact_count')
                .in('id', campaign.target_segments);

            if (groups) {
                console.log('   Target groups:');
                groups.forEach(group => {
                    console.log(`     - ${group.name} (${group.contact_count} contacts) - ID: ${group.id}`);
                });
            }

            // Debug: Check all contacts
            const { data: allContacts } = await supabase
                .from('contacts')
                .select('id, name, phone_number, group_id')
                .limit(5);

            if (allContacts) {
                console.log('   Sample contacts:');
                allContacts.forEach(contact => {
                    console.log(`     - ${contact.name} (${contact.phone_number}) - Group: ${contact.group_id}`);
                });
            }
            return;
        }

        console.log(`✅ Found ${contacts.length} contacts to send to:`);
        contacts.forEach(contact => {
            console.log(`   - ${contact.name} (${contact.phone_number})`);
        });

        // Step 4: Test Twilio message creation (dry run)
        console.log('\n🧪 Testing Twilio message creation (dry run)...');

        const testContact = contacts[0];
        const templateData = {
            name: testContact.name || "Customer",
            email: "",
        };

        // Simulate template variable processing
        const contentVariables = {};
        if (template.variables && template.variables.length > 0) {
            template.variables.forEach((variable, index) => {
                const key = (index + 1).toString();
                contentVariables[key] = templateData[variable] || "";
            });
        }

        console.log('✅ Template variables prepared:', contentVariables);

        // Step 5: Check if messages already exist
        const { data: existingMessages } = await supabase
            .from('campaign_messages')
            .select('id, status, error_message')
            .eq('campaign_id', campaignId);

        if (existingMessages && existingMessages.length > 0) {
            console.log(`📊 Existing messages: ${existingMessages.length}`);
            const statusCounts = existingMessages.reduce((acc, msg) => {
                acc[msg.status] = (acc[msg.status] || 0) + 1;
                return acc;
            }, {});
            console.log('   Status breakdown:', statusCounts);
        } else {
            console.log('📊 No existing messages found');
        }

        console.log('✅ Campaign send simulation completed successfully');

    } catch (error) {
        console.error('❌ Simulation error:', error);
    }
}

async function testManualSend(campaignId) {
    console.log(`📤 Testing manual send for campaign: ${campaignId}`);

    try {
        // Make API call to send campaign
        const response = await fetch(`http://localhost:3000/api/campaigns/${campaignId}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token', // You'll need to use a real auth token
            },
            body: JSON.stringify({
                batchSize: 5,
                delayBetweenBatches: 1000
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Manual send successful:', result);
        } else {
            const error = await response.text();
            console.error('❌ Manual send failed:', response.status, error);
        }

    } catch (error) {
        console.error('❌ Manual send error:', error.message);
        console.log('💡 Note: This test requires the Next.js server to be running (pnpm dev)');
    }
}

async function createTestCampaign() {
    console.log('🆕 Creating test campaign...');

    try {
        // Get first approved template
        const { data: template } = await supabase
            .from('message_templates')
            .select('id, name')
            .eq('status', 'approved')
            .limit(1)
            .single();

        if (!template) {
            console.error('❌ No approved templates found');
            return;
        }

        // Get first contact group with contacts
        const { data: group } = await supabase
            .from('contact_groups')
            .select('id, name, contact_count')
            .gt('contact_count', 0)
            .limit(1)
            .single();

        if (!group) {
            console.error('❌ No contact groups with contacts found');
            return;
        }

        // Create test campaign
        const { data: campaign, error } = await supabase
            .from('campaigns')
            .insert({
                name: `Test Campaign ${Date.now()}`,
                description: 'Auto-generated test campaign',
                template_id: template.id,
                target_segments: [group.id],
                schedule_type: 'immediate',
                status: 'draft'
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating test campaign:', error);
            return;
        }

        console.log(`✅ Test campaign created: ${campaign.name} (${campaign.id})`);
        console.log(`   Template: ${template.name}`);
        console.log(`   Target group: ${group.name} (${group.contact_count} contacts)`);

        // Test sending the campaign
        await simulateCampaignSend(campaign.id);

    } catch (error) {
        console.error('❌ Error creating test campaign:', error);
    }
}

// Run the test
testCampaignSend().then(() => {
    console.log('\n🎉 Campaign send test complete!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal test error:', error);
    process.exit(1);
}); 