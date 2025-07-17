// Route alias for webhook compatibility
// This forwards requests to the main webhook endpoint
import { NextRequest } from "next/server";

// Import the actual webhook handlers
import { POST as MainWebhookPOST, GET as MainWebhookGET } from "@/app/api/webhooks/twilio/route";

// Forward POST requests to the main webhook
export async function POST(request: NextRequest) {
  return MainWebhookPOST(request);
}

// Forward GET requests to the main webhook
export async function GET(request: NextRequest) {
  return MainWebhookGET(request);
}
