#!/usr/bin/env node

// Test Twilio Webhook with Real Message
require('dotenv').config({ path: '../../.env' });
const twilio = require('twilio');

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;
const toNumber = process.env.TWILIO_TO_NUMBER;
const webhookUrl = process.env.TWILIO_WEBHOOK_URL;

const client = twilio(accountSid, authToken);

async function testTwilioWebhook() {
    console.log('🧪 Testing Twilio Webhook with Real Message\n');

    try {
        console.log('📋 Configuration:');
        console.log(`   Account SID: ${accountSid ? '✅ Set' : '❌ Missing'}`);
        console.log(`   Auth Token: ${authToken ? '✅ Set' : '❌ Missing'}`);
        console.log(`   From Number: ${fromNumber || 'Not set'}`);
        console.log(`   To Number: ${toNumber || 'Not set'}`);
        console.log(`   Webhook URL: ${webhookUrl || 'Not set'}`);

        if (!accountSid || !authToken || !fromNumber || !toNumber) {
            console.error('❌ Missing required Twilio configuration');
            return;
        }

        // Test 1: Send a simple text message (non-template)
        console.log('\n1. Testing simple WhatsApp message...');

        try {
            const message = await client.messages.create({
                body: `Test webhook message - ${new Date().toISOString()}`,
                from: `whatsapp:${fromNumber}`,
                to: `whatsapp:${toNumber}`,
                statusCallback: webhookUrl
            });

            console.log('✅ Simple message sent successfully:');
            console.log(`   Message SID: ${message.sid}`);
            console.log(`   Status: ${message.status}`);
            console.log(`   Body: ${message.body}`);

            console.log('\n💡 Monitor your webhook logs to see status updates');
            console.log('   Expected statuses: queued → sent → delivered → read');

        } catch (error) {
            console.error('❌ Error sending simple message:', error.message);
            if (error.code === 21211) {
                console.log('💡 This might be because you need an approved template for business-initiated messages');
                console.log('   Try sending a message FROM your WhatsApp to the sender first');
            }
        }

        // Test 2: Send using content template (if available)
        console.log('\n2. Testing WhatsApp Content Template...');

        try {
            // Use one of your approved templates
            const contentMessage = await client.messages.create({
                contentSid: 'HX63ef098f29d95b67d59ee4aa91e1a073', // message_opt_in template
                contentVariables: JSON.stringify({}), // No variables for this template
                from: `whatsapp:${fromNumber}`,
                to: `whatsapp:${toNumber}`,
                statusCallback: webhookUrl
            });

            console.log('✅ Content template message sent successfully:');
            console.log(`   Message SID: ${contentMessage.sid}`);
            console.log(`   Status: ${contentMessage.status}`);

            console.log('\n🎯 This is exactly how your campaigns send messages!');
            console.log('   Monitor webhook logs for status updates on this message');

            // Wait a moment and check message status
            console.log('\n⏳ Waiting 5 seconds to check message status...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            const updatedMessage = await client.messages(contentMessage.sid).fetch();
            console.log(`   Updated status: ${updatedMessage.status}`);

            if (updatedMessage.errorCode) {
                console.log(`   Error code: ${updatedMessage.errorCode}`);
                console.log(`   Error message: ${updatedMessage.errorMessage}`);
            }

        } catch (error) {
            console.error('❌ Error sending content template:', error.message);
            console.log('   Error code:', error.code);

            if (error.code === 21211) {
                console.log('💡 To fix this: Send any message from your WhatsApp to the business number first');
                console.log('   This opens a 24-hour messaging window');
            }
        }

        // Test 3: Check webhook endpoint
        console.log('\n3. Testing webhook endpoint accessibility...');

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    MessageSid: 'TEST_MESSAGE_SID',
                    MessageStatus: 'delivered',
                    From: `whatsapp:${fromNumber}`,
                    To: `whatsapp:${toNumber}`,
                    Body: 'Test webhook call',
                    ApiVersion: '2010-04-01',
                    AccountSid: accountSid
                })
            });

            if (response.ok) {
                console.log('✅ Webhook endpoint responded successfully');
                console.log(`   Response status: ${response.status}`);
            } else {
                console.log(`❌ Webhook endpoint error: ${response.status}`);
            }

        } catch (error) {
            console.error('❌ Webhook endpoint test failed:', error.message);
        }

        console.log('\n📝 Next Steps:');
        console.log('1. Check your Next.js development server logs for webhook calls');
        console.log('2. Look for status updates from queued → sent → delivered → read');
        console.log('3. If no webhooks appear, check Twilio Console webhook configuration');
        console.log('4. Make sure your webhook URL is publicly accessible');

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Run the test
testTwilioWebhook().then(() => {
    console.log('\n🎉 Webhook test complete!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
}); 