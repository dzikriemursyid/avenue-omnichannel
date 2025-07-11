// Webhook server for handling Twilio WhatsApp message status callbacks and incoming messages
// Run this with ngrok for tunneling

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Twilio client for auto-replies (optional)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Auto-reply function
async function sendAutoReply(toNumber, originalMessage) {
    if (!twilioClient) {
        console.log('⚠️  Auto-reply disabled: Twilio credentials not found');
        return;
    }

    const fromNumber = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+628979118504";

    // Simple auto-reply logic
    let replyMessage = "Thanks for your message! This is an automated response.";

    // You can add more sophisticated auto-reply logic here
    if (originalMessage.toLowerCase().includes('hello')) {
        replyMessage = "Hello! Thanks for reaching out. How can I help you today?";
    } else if (originalMessage.toLowerCase().includes('help')) {
        replyMessage = "I'm here to help! Please describe what you need assistance with.";
    }

    try {
        const message = await twilioClient.messages.create({
            body: replyMessage,
            from: fromNumber,
            to: toNumber,
        });

        console.log(`🤖 Auto-reply sent: "${replyMessage}" (SID: ${message.sid})`);
        return message;
    } catch (error) {
        console.error('❌ Error sending auto-reply:', error.message);
    }
}

// Middleware to parse URL-encoded bodies (Twilio sends data as form-encoded)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Middleware to log all incoming requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Webhook endpoint for incoming WhatsApp messages
app.post('/webhook/twilio/incoming', (req, res) => {
    console.log('\n=== Incoming WhatsApp Message Received ===');
    console.log('Timestamp:', new Date().toISOString());

    // Log all parameters sent by Twilio
    console.log('Request Body:', JSON.stringify(req.body, null, 2));

    // Extract key information for incoming messages
    const {
        MessageSid,
        From,
        To,
        Body,
        MediaUrl0,
        MediaContentType0,
        NumMedia,
        ProfileName,
        WaId,
        SmsMessageSid,
        ApiVersion,
        AccountSid
    } = req.body;

    console.log('Incoming Message Details:');
    console.log('  SID:', MessageSid);
    console.log('  From:', From);
    console.log('  To:', To);
    console.log('  Body:', Body);
    console.log('  Profile Name:', ProfileName);
    console.log('  WhatsApp ID:', WaId);

    // Handle media if present
    if (NumMedia && parseInt(NumMedia) > 0) {
        console.log('  Media Count:', NumMedia);
        console.log('  Media URL:', MediaUrl0);
        console.log('  Media Type:', MediaContentType0);
    }

    console.log('  Account SID:', AccountSid);
    console.log('  API Version:', ApiVersion);
    console.log('==========================================\n');

    // Here you can add your business logic to process the incoming message
    // For example:
    // - Store in database
    // - Forward to team members
    // - Auto-reply logic
    // - Integration with your omnichannel system

    // Example: Log the message for processing
    if (Body) {
        console.log(`💬 Message from ${ProfileName || WaId}: "${Body}"`);

        // Auto-reply to incoming messages (optional - uncomment to enable)
        // await sendAutoReply(From, Body);
    }

    // Respond to Twilio (must respond with 200 status)
    res.status(200).send('OK');
});

// Webhook endpoint for Twilio status callbacks
app.post('/webhook/twilio/status', (req, res) => {
    console.log('\n=== Twilio Status Callback Received ===');
    console.log('Timestamp:', new Date().toISOString());

    // Log all parameters sent by Twilio
    console.log('Request Body:', JSON.stringify(req.body, null, 2));

    // Extract key information
    const {
        MessageSid,
        MessageStatus,
        ErrorCode,
        ErrorMessage,
        From,
        To,
        Body,
        ApiVersion,
        AccountSid
    } = req.body;

    console.log('Message Details:');
    console.log('  SID:', MessageSid);
    console.log('  Status:', MessageStatus);
    console.log('  From:', From);
    console.log('  To:', To);
    console.log('  Body:', Body);

    if (ErrorCode) {
        console.log('  Error Code:', ErrorCode);
        console.log('  Error Message:', ErrorMessage);
    }

    console.log('  Account SID:', AccountSid);
    console.log('  API Version:', ApiVersion);
    console.log('=====================================\n');

    // Handle different message statuses
    switch (MessageStatus) {
        case 'queued':
            console.log('📤 Message queued for delivery');
            break;
        case 'sent':
            console.log('✈️ Message sent to WhatsApp');
            break;
        case 'delivered':
            console.log('✅ Message delivered to recipient');
            break;
        case 'read':
            console.log('👁️ Message read by recipient');
            break;
        case 'failed':
            console.log('❌ Message failed to deliver');
            break;
        case 'undelivered':
            console.log('⚠️ Message undelivered');
            break;
        default:
            console.log(`📊 Message status: ${MessageStatus}`);
    }

    // Respond to Twilio (must respond with 200 status)
    res.status(200).send('OK');
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Root endpoint - handle both GET and POST for debugging
app.all('/', (req, res) => {
    console.log('\n=== ROOT ENDPOINT HIT ===');
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('========================\n');

    if (req.method === 'POST') {
        // This might be a Twilio webhook hitting the wrong endpoint
        console.log('⚠️  WARNING: POST request to root - this might be your Twilio webhook!');
        console.log('📍 Expected endpoints: /webhook/twilio/incoming or /webhook/twilio/status');

        // Respond OK to Twilio to prevent retries
        res.status(200).send('OK - Wrong endpoint, use /webhook/twilio/incoming or /webhook/twilio/status');
        return;
    }

    res.json({
        message: 'Twilio WhatsApp Webhook Server',
        endpoints: {
            'incoming_messages': '/webhook/twilio/incoming',
            'status_callbacks': '/webhook/twilio/status',
            'health': '/health'
        },
        webhookUrls: {
            'incoming_messages': 'https://webhook.dzynthesis.dev/webhook/twilio/incoming',
            'status_callbacks': 'https://webhook.dzynthesis.dev/webhook/twilio/status'
        },
        instructions: [
            '1. Start this server: node webhook.js',
            '2. Your cloudflared tunnel is ready: https://webhook.dzynthesis.dev',
            '3. Configure webhooks in Twilio Console:',
            '   - Incoming Messages: https://webhook.dzynthesis.dev/webhook/twilio/incoming',
            '   - Status Callbacks: https://webhook.dzynthesis.dev/webhook/twilio/status',
            '4. Run your test: node test.js'
        ]
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Twilio Webhook Server running on port ${PORT}`);
    console.log(`📡 Incoming Messages: http://localhost:${PORT}/webhook/twilio/incoming`);
    console.log(`📊 Status Callbacks: http://localhost:${PORT}/webhook/twilio/status`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log('\n🌐 Your cloudflared tunnel URLs:');
    console.log('📥 Incoming Messages: https://webhook.dzynthesis.dev/webhook/twilio/incoming');
    console.log('📊 Status Callbacks: https://webhook.dzynthesis.dev/webhook/twilio/status');
    console.log('\n📋 Next steps:');
    console.log('1. Configure webhooks in Twilio Console:');
    console.log('   Go to: https://console.twilio.com/us1/develop/sms/whatsapp/senders');
    console.log('   Set "When a message comes in": https://webhook.dzynthesis.dev/webhook/twilio/incoming');
    console.log('2. Status callbacks are already configured in test.js');
    console.log('3. Run your test: node test.js');
    console.log('\n⏳ Waiting for webhook calls...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down webhook server...');
    process.exit(0);
});

module.exports = app; 