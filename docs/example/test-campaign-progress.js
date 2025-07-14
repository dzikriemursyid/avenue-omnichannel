#!/usr/bin/env node

/**
 * Test Campaign Progress Tracking
 * 
 * This script tests the campaign progress tracking and webhook functionality
 * by simulating message status updates and verifying the analytics are updated.
 */

const BASE_URL = 'http://localhost:3000'

// Test campaign progress tracking
async function testCampaignProgress() {
    console.log('🧪 Testing Campaign Progress Tracking\n')

    try {
        // Test 1: Check campaigns endpoint
        console.log('1. Testing campaigns API...')
        const campaignsResponse = await fetch(`${BASE_URL}/api/dashboard/campaigns`, {
            headers: {
                'Authorization': 'Bearer YOUR_TOKEN', // Replace with actual token
            }
        })

        if (campaignsResponse.ok) {
            const campaignsData = await campaignsResponse.json()
            console.log('✅ Campaigns API working')
            console.log(`   Found ${campaignsData.data?.campaigns?.length || 0} campaigns`)

            if (campaignsData.data?.campaigns?.length > 0) {
                const campaign = campaignsData.data.campaigns[0]
                console.log(`   Sample campaign: ${campaign.name} (${campaign.status})`)
                console.log(`   Analytics: ${campaign.sent_count} sent, ${campaign.delivered_count} delivered, ${campaign.read_count} read`)
            }
        } else {
            console.log('❌ Campaigns API failed:', campaignsResponse.status)
        }

        // Test 2: Check webhook endpoint
        console.log('\n2. Testing webhook endpoint...')
        const webhookResponse = await fetch(`${BASE_URL}/api/webhooks/twilio`, {
            method: 'GET'
        })

        if (webhookResponse.ok) {
            const webhookData = await webhookResponse.json()
            console.log('✅ Webhook endpoint accessible')
            console.log(`   Webhook URL: ${webhookData.webhookUrl}`)
        } else {
            console.log('❌ Webhook endpoint failed:', webhookResponse.status)
        }

        // Test 3: Simulate webhook status update
        console.log('\n3. Testing webhook status update...')
        const testWebhookData = new URLSearchParams({
            MessageSid: 'SM_test_' + Date.now(),
            MessageStatus: 'delivered',
            From: 'whatsapp:+6281234567890',
            To: 'whatsapp:+628979118504',
            Body: 'Test message',
            ApiVersion: '2010-04-01',
            AccountSid: 'AC_test_account'
        })

        const webhookTestResponse = await fetch(`${BASE_URL}/api/webhooks/twilio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: testWebhookData.toString()
        })

        if (webhookTestResponse.ok) {
            console.log('✅ Webhook accepts POST requests')
            console.log('   Status update processed (check logs for details)')
        } else {
            console.log('❌ Webhook POST failed:', webhookTestResponse.status)
        }

        // Test 4: Check individual campaign endpoint
        console.log('\n4. Testing individual campaign API...')
        // You would need to replace 'CAMPAIGN_ID' with an actual campaign ID
        const testCampaignId = 'test-campaign-id'
        const campaignResponse = await fetch(`${BASE_URL}/api/dashboard/campaigns/${testCampaignId}`, {
            headers: {
                'Authorization': 'Bearer YOUR_TOKEN', // Replace with actual token
            }
        })

        if (campaignResponse.ok) {
            const campaignData = await campaignResponse.json()
            console.log('✅ Individual campaign API working')
            console.log(`   Campaign: ${campaignData.data?.name}`)
            console.log(`   Progress: ${campaignData.data?.sent_count}/${campaignData.data?.target_count} sent`)
            console.log(`   Rates: ${campaignData.data?.delivery_rate}% delivery, ${campaignData.data?.read_rate}% read`)
        } else {
            console.log('ℹ️  Individual campaign API test skipped (need valid campaign ID)')
        }

        console.log('\n🎉 Campaign Progress Testing Complete!')
        console.log('\nNext steps:')
        console.log('1. Create a real campaign through the dashboard')
        console.log('2. Send the campaign to test contacts')
        console.log('3. Monitor the webhook logs in your terminal')
        console.log('4. Check the campaign overview for real-time updates')
        console.log('5. Verify the analytics are updating correctly')

    } catch (error) {
        console.error('❌ Test failed:', error.message)
    }
}

// Test webhook data structure
function testWebhookDataStructure() {
    console.log('\n📊 Webhook Data Structure Test')

    const sampleStatuses = ['queued', 'sent', 'delivered', 'read', 'failed']

    sampleStatuses.forEach(status => {
        const testData = {
            MessageSid: `SM_test_${status}_${Date.now()}`,
            MessageStatus: status,
            From: 'whatsapp:+6281234567890',
            To: 'whatsapp:+628979118504',
            Body: `Test ${status} message`,
            ApiVersion: '2010-04-01',
            AccountSid: 'AC_test_account'
        }

        if (status === 'failed') {
            testData.ErrorCode = '30008'
            testData.ErrorMessage = 'Unknown error'
        }

        console.log(`${status.toUpperCase()} status data:`, JSON.stringify(testData, null, 2))
    })
}

// Run tests
async function runTests() {
    console.log('🚀 Starting Campaign Progress Tests\n')

    await testCampaignProgress()
    testWebhookDataStructure()

    console.log('\n📝 Manual Testing Checklist:')
    console.log('□ Create a campaign with a small contact group')
    console.log('□ Send the campaign immediately')
    console.log('□ Watch the campaign overview page for real-time updates')
    console.log('□ Check the campaign details page for detailed analytics')
    console.log('□ Verify webhook logs show status updates')
    console.log('□ Confirm analytics match the webhook updates')
    console.log('□ Test auto-refresh functionality')
    console.log('□ Verify campaign status changes to "completed" when done')
}

// Run the tests
runTests().catch(console.error) 