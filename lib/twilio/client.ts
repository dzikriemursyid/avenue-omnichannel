// Twilio Client Configuration and Utilities
import twilio from "twilio";

// Twilio configuration from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+628979118504";

// Initialize Twilio client
export const twilioClient = twilio(accountSid, authToken);

// WhatsApp message configuration
export const whatsappConfig = {
  from: fromNumber,
  statusCallback: process.env.TWILIO_WEBHOOK_URL || "https://webhook.dzynthesis.dev/webhook/twilio/status",
};

// Message status mapping
export const messageStatusMap = {
  queued: "pending",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
  undelivered: "failed",
} as const;

export type TwilioMessageStatus = keyof typeof messageStatusMap;
export type InternalMessageStatus = (typeof messageStatusMap)[TwilioMessageStatus];

// Helper function to format WhatsApp number
export function formatWhatsAppNumber(phoneNumber: string): string {
  // Remove any whitespace
  const cleaned = phoneNumber.replace(/\s+/g, "");

  // If already in WhatsApp format, return as is
  if (cleaned.startsWith("whatsapp:")) {
    return cleaned;
  }

  // Add whatsapp: prefix
  return `whatsapp:${cleaned}`;
}

// Helper function to personalize template variables
export function personalizeTemplate(variables: string[], data: Record<string, any>): Record<string, string> {
  const personalized: Record<string, string> = {};

  variables.forEach((variable, index) => {
    // Variables are 1-indexed in WhatsApp templates
    const key = (index + 1).toString();
    personalized[key] = data[variable] || "";
  });

  return personalized;
}
