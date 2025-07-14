// Test script to simulate Twilio webhook calls
// This helps verify that your webhook endpoint is working correctly

const axios = require('axios');

// Configuration
const WEBHOOK_URL = 'https://webhook.dzynthesis.dev/webhook/twilio/status';
const LOCAL_WEBHOOK_URL = 'http://localhost:3000/api/webhooks/twilio';

// Sample Twilio webhook data for different message statuses
const sampleWebhookData = {
    queued: {
        MessageSid: 'SM1234567890abcdef1234567890abcdef',
        MessageStatus: 'queued',
        From: 'whatsapp:+6281234567890',
        To: 'whatsapp:+628979118504',
        Body: 'Test message',
        ApiVersion: '2010-04-01',
        AccountSid: 'YOUR_TWILIO_ACCOUNT_SID'
    },
    sent: {
        MessageSid: 'SM1234567890abcdef1234567890abcdef',
        MessageStatus: 'sent',
        From: 'whatsapp:+6281234567890',
        To: 'whatsapp:+628979118504',
        Body: 'Test message',
        ApiVersion: '2010-04-01',
        AccountSid: 'YOUR_TWILIO_ACCOUNT_SID'
    },
    delivered: {
        MessageSid: 'SM1234567890abcdef1234567890abcdef',
        MessageStatus: 'delivered',
        From: 'whatsapp:+6281234567890',
        To: 'whatsapp:+628979118504',
        Body: 'Test message',
        ApiVersion: '2010-04-01',
        AccountSid: 'YOUR_TWILIO_ACCOUNT_SID'
    },
    read: {
        MessageSid: 'SM1234567890abcdef1234567890abcdef',
        MessageStatus: 'read',
        From: 'whatsapp:+6281234567890',
        To: 'whatsapp:+628979118504',
        Body: 'Test message',
        ApiVersion: '2010-04-01',
        AccountSid: 'YOUR_TWILIO_ACCOUNT_SID'
    },
    failed: {
        MessageSid: 'SM1234567890abcdef1234567890abcdef',
        MessageStatus: 'failed',
        ErrorCode: '30008',
        ErrorMessage: 'Unknown error',
        From: 'whatsapp:+6281234567890',
        To: 'whatsapp:+628979118504',
        Body: 'Test message',
        ApiVersion: '2010-04-01',
        AccountSid: 'YOUR_TWILIO_ACCOUNT_SID'
    }
};

// Function to send webhook test
async function testWebhook(status, useLocal = false) {
    const url = useLocal ? LOCAL_WEBHOOK_URL : WEBHOOK_URL;
    const data = sampleWebhookData[status];

    console.log(`\n🧪 Testing ${status} webhook to: ${url}`);
    console.log('📤 Sending data:', JSON.stringify(data, null, 2));

    try {
        const response = await axios.post(url, new URLSearchParams(data), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'TwilioProxy/1.1'
            },
            timeout: 10000
        });

        console.log('✅ Response:', response.status, response.statusText);
        console.log('📥 Response data:', response.data);

        return true;
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.statusText);
        console.error('📥 Error data:', error.response?.data);
        return false;
    }
}

// Function to test GET endpoint
async function testGetEndpoint(useLocal = false) {
    const url = useLocal ? LOCAL_WEBHOOK_URL : WEBHOOK_URL;

    console.log(`\n🔍 Testing GET endpoint: ${url}`);

    try {
        const response = await axios.get(url, { timeout: 5000 });
        console.log('✅ GET Response:', response.status);
        console.log('📥 Response data:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ GET Error:', error.response?.status, error.response?.statusText);
        console.error('📥 Error data:', error.response?.data);
        return false;
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting Twilio Webhook Tests');
    console.log('==================================');

    // Test GET endpoint first
    console.log('\n📋 Testing GET endpoint...');
    await testGetEndpoint(true); // Test local first
    await testGetEndpoint(false); // Then test remote

    // Test different webhook statuses
    const statuses = ['queued', 'sent', 'delivered', 'read', 'failed'];

    for (const status of statuses) {
        await testWebhook(status, true); // Test local
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        await testWebhook(status, false); // Test remote
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }

    console.log('\n✅ All tests completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Check your webhook server logs for the test data');
    console.log('2. Verify that the database is being updated correctly');
    console.log('3. Send a real WhatsApp message to test with actual Twilio webhooks');
}

// Run tests if called directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testWebhook, testGetEndpoint, runTests }; 