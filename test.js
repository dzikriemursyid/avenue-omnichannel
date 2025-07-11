// Test script for WhatsApp Business API via Twilio
// Based on Twilio documentation

const twilio = require("twilio");

// Environment variables - you'll need to set these
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const webhookUrl = 'https://webhook.dzynthesis.dev/webhook/twilio/status'; // You'll set this after running ngrok

// WhatsApp Business numbers (replace with your actual numbers)
const fromNumber = "whatsapp:+628979118504"; // Your verified WhatsApp Business number
const toNumber = "whatsapp:+6287864457646"; // Recipient's WhatsApp number

// Initialize Twilio client
const client = twilio(accountSid, authToken);

async function sendWhatsAppMessage() {
    try {
        console.log("Sending WhatsApp message...");

        const message = await client.messages.create({
            body: "Hey, I just met you, and this is crazy...",
            from: fromNumber, // Your verified WhatsApp Business number
            statusCallback: webhookUrl, // Your ngrok webhook URL
            to: toNumber, // Recipient's WhatsApp number
        });

        console.log("Message sent successfully!");
        console.log("Message SID:", message.sid);
        console.log("Message Body:", message.body);
        console.log("Status:", message.status);
        console.log("To:", message.to);
        console.log("From:", message.from);

    } catch (error) {
        console.error("Error sending message:", error.message);
        if (error.code) {
            console.error("Error code:", error.code);
        }
    }
}

// Alternative function with custom message
async function sendCustomMessage(messageBody, recipientNumber) {
    try {
        console.log(`Sending custom message to ${recipientNumber}...`);

        const message = await client.messages.create({
            body: messageBody,
            from: fromNumber, // Your verified WhatsApp Business number
            statusCallback: webhookUrl,
            to: `whatsapp:${recipientNumber}`,
        });

        console.log("Custom message sent successfully!");
        console.log("Message SID:", message.sid);
        console.log("Status:", message.status);

        return message;
    } catch (error) {
        console.error("Error sending custom message:", error.message);
        throw error;
    }
}

// Check if required environment variables are set
function checkEnvironmentVariables() {
    const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WEBHOOK_URL'];
    const recommended = ['TWILIO_WHATSAPP_FROM', 'TWILIO_WHATSAPP_TO'];

    const missing = required.filter(env => !process.env[env]);
    const missingRecommended = recommended.filter(env => !process.env[env]);

    if (missing.length > 0) {
        console.error("Missing required environment variables:", missing.join(', '));
        console.log("Please set the following environment variables:");
        missing.forEach(env => console.log(`export ${env}=your_value_here`));
        return false;
    }

    if (missingRecommended.length > 0) {
        console.warn("⚠️  Missing recommended environment variables:", missingRecommended.join(', '));
        console.log("Using default placeholder numbers. Please set:");
        missingRecommended.forEach(env => console.log(`export ${env}=your_actual_whatsapp_number`));
        console.log("Current values:");
        console.log(`From: ${fromNumber}`);
        console.log(`To: ${toNumber}`);
    }

    return true;
}

// Main execution
async function main() {
    console.log("WhatsApp Business API Test via Twilio");
    console.log("=====================================");

    if (!checkEnvironmentVariables()) {
        process.exit(1);
    }

    // Send test message
    await sendWhatsAppMessage();

    // Uncomment to send a custom message
    // await sendCustomMessage("Hello from Twilio WhatsApp API!", "+15005550006");
}

// Export functions for use in other modules
module.exports = {
    sendWhatsAppMessage,
    sendCustomMessage,
    checkEnvironmentVariables
};

// Run if this file is executed directly
if (require.main === module) {
    main();
} 