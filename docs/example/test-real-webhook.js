// Script to test webhook with real campaign message SIDs
// This helps you verify webhook functionality with actual database records

const axios = require('axios');

// Configuration
const WEBHOOK_URL = 'https://webhook.dzynthesis.dev/webhook/twilio/status';
const LOCAL_WEBHOOK_URL = 'http://localhost:3000/api/webhooks/twilio';

// Function to test webhook with real message SID
async function testRealWebhook(messageSid, status = 'delivered', useLocal = false) {
    const url = useLocal ? LOCAL_WEBHOOK_URL : WEBHOOK_URL;

    const webhookData = {
        MessageSid: messageSid,
        MessageStatus: status,
        From: 'whatsapp:+6287864457646', // Your test number
        To: 'whatsapp:+628979118504',    // Your Twilio number
        Body: 'Real campaign message',
        ApiVersion: '2010-04-01',
        AccountSid: 'YOUR_TWILIO_ACCOUNT_SID' // Replace with your actual account SID
    };

    // Add error fields for failed status
    if (status === 'failed') {
        webhookData.ErrorCode = '30008';
        webhookData.ErrorMessage = 'Test failure';
    }

    console.log(`\n🧪 Testing ${status} webhook with real SID: ${messageSid}`);
    console.log(`📍 URL: ${url}`);
    console.log('📤 Sending data:', JSON.stringify(webhookData, null, 2));

    try {
        const response = await axios.post(url, new URLSearchParams(webhookData), {
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

// Function to monitor webhook logs
function startWebhookMonitoring() {
    console.log('\n🔍 WEBHOOK MONITORING GUIDE');
    console.log('============================');
    console.log('');
    console.log('To monitor webhook logs when sending real campaigns:');
    console.log('');
    console.log('1. 🚀 Start your Next.js dev server:');
    console.log('   pnpm dev');
    console.log('');
    console.log('2. 🌐 Make sure your tunnel is running:');
    console.log('   Your cloudflared tunnel should forward:');
    console.log('   webhook.dzynthesis.dev → http://localhost:3000');
    console.log('');
    console.log('3. 📊 Send a campaign from your dashboard');
    console.log('');
    console.log('4. 👀 Watch the terminal for webhook logs like:');
    console.log('   === Twilio Status Callback Received ===');
    console.log('   Message Details:');
    console.log('     SID: SM[real-twilio-message-sid]');
    console.log('     Status: sent');
    console.log('   ✅ Found campaign message: {...}');
    console.log('   ✅ Successfully updated campaign message status');
    console.log('');
    console.log('5. 📈 Check your campaign analytics in the dashboard');
    console.log('');
    console.log('🔗 Webhook endpoints:');
    console.log('   Remote: https://webhook.dzynthesis.dev/webhook/twilio/status');
    console.log('   Local:  http://localhost:3000/api/webhooks/twilio');
    console.log('   Alias:  http://localhost:3000/webhook/twilio/status');
    console.log('');
}

// Main function
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        startWebhookMonitoring();
        return;
    }

    const command = args[0];

    if (command === 'test' && args[1]) {
        const messageSid = args[1];
        const status = args[2] || 'delivered';
        const useLocal = args.includes('--local');

        console.log('🚀 Testing webhook with real message SID');
        await testRealWebhook(messageSid, status, useLocal);
    } else if (command === 'monitor') {
        startWebhookMonitoring();
    } else {
        console.log('📋 Usage:');
        console.log('  node test-real-webhook.js                    # Show monitoring guide');
        console.log('  node test-real-webhook.js monitor            # Show monitoring guide');
        console.log('  node test-real-webhook.js test <SID>         # Test with real message SID');
        console.log('  node test-real-webhook.js test <SID> sent    # Test with specific status');
        console.log('  node test-real-webhook.js test <SID> --local # Test local endpoint');
        console.log('');
        console.log('Examples:');
        console.log('  node test-real-webhook.js test SM1234567890abcdef1234567890abcdef');
        console.log('  node test-real-webhook.js test SM1234567890abcdef1234567890abcdef delivered');
        console.log('  node test-real-webhook.js test SM1234567890abcdef1234567890abcdef failed');
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testRealWebhook, startWebhookMonitoring }; 