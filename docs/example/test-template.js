// Test script for WhatsApp Business API Content Templates via Twilio
// Based on Twilio documentation for content templates

const twilio = require("twilio");

// Environment variables - you'll need to set these
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const webhookUrl = 'https://webhook.dzynthesis.dev/webhook/twilio/status';

// WhatsApp Business numbers (replace with your actual numbers)
const fromNumber = "whatsapp:+628979118504"; // Your verified WhatsApp Business number
const toNumber = "whatsapp:+6287864457646"; // Recipient's WhatsApp number

// Content Template SID - you'll need to create this in Twilio Console
// Go to: https://console.twilio.com/us1/content/content-templates
const contentSid = process.env.TWILIO_CONTENT_SID || "HXa7df58b3e964f4cd5a54fd10cd615761"; // Replace with your actual Content SID

// Initialize Twilio client
const client = twilio(accountSid, authToken);

async function sendContentTemplate() {
    try {
        console.log("Sending WhatsApp Content Template...");
        console.log("Content SID:", contentSid);

        const message = await client.messages.create({
            contentSid: contentSid,
            contentVariables: JSON.stringify({
                1: "John Doe" // Replace "Name" placeholder in your template
            }),
            from: fromNumber,
            statusCallback: webhookUrl,
            to: toNumber,
        });

        console.log("✅ Content Template sent successfully!");
        console.log("Message SID:", message.sid);
        console.log("Message Body:", message.body);
        console.log("Status:", message.status);
        console.log("To:", message.to);
        console.log("From:", message.from);

        return message;
    } catch (error) {
        console.error("❌ Error sending content template:", error.message);
        if (error.code) {
            console.error("Error code:", error.code);
        }
        throw error;
    }
}

// Alternative function with custom content variables
async function sendCustomTemplate(templateVariables, recipientNumber) {
    try {
        console.log(`Sending custom template to ${recipientNumber}...`);
        console.log("Template variables:", templateVariables);

        const message = await client.messages.create({
            contentSid: contentSid,
            contentVariables: JSON.stringify(templateVariables),
            from: fromNumber,
            statusCallback: webhookUrl,
            to: `whatsapp:${recipientNumber}`,
        });

        console.log("✅ Custom template sent successfully!");
        console.log("Message SID:", message.sid);
        console.log("Status:", message.status);

        return message;
    } catch (error) {
        console.error("❌ Error sending custom template:", error.message);
        throw error;
    }
}

// Check if required environment variables are set
function checkEnvironmentVariables() {
    const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
    const recommended = ['TWILIO_CONTENT_SID', 'TWILIO_WHATSAPP_FROM', 'TWILIO_WHATSAPP_TO'];

    const missing = required.filter(env => !process.env[env]);
    const missingRecommended = recommended.filter(env => !process.env[env]);

    if (missing.length > 0) {
        console.error("❌ Missing required environment variables:", missing.join(', '));
        console.log("Please set the following environment variables:");
        missing.forEach(env => console.log(`export ${env}=your_value_here`));
        return false;
    }

    if (missingRecommended.length > 0) {
        console.warn("⚠️  Missing recommended environment variables:", missingRecommended.join(', '));
        console.log("Using default values. Please set:");
        missingRecommended.forEach(env => console.log(`export ${env}=your_actual_value`));
        console.log("\nCurrent values:");
        console.log(`Content SID: ${contentSid}`);
        console.log(`From: ${fromNumber}`);
        console.log(`To: ${toNumber}`);
    }

    return true;
}

// Main execution
async function main() {
    console.log("WhatsApp Business API Content Template Test via Twilio");
    console.log("=====================================================");

    if (!checkEnvironmentVariables()) {
        process.exit(1);
    }

    // Send content template
    await sendContentTemplate();

    // Uncomment to send a custom template with different variables
    // await sendCustomTemplate({ 
    //     1: "Alice Smith",
    //     2: "Premium Support"
    // }, "+6287864457646");
}

// Export functions for use in other modules
module.exports = {
    sendContentTemplate,
    sendCustomTemplate,
    checkEnvironmentVariables
};

// Run if this file is executed directly
if (require.main === module) {
    main();
} 