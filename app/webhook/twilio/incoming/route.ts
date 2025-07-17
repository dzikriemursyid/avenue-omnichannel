// Route alias for incoming webhook compatibility
// This forwards requests to the incoming webhook endpoint
import { NextRequest } from "next/server";

// Import the actual webhook handlers
import { POST as IncomingWebhookPOST, GET as IncomingWebhookGET } from "@/app/api/webhooks/twilio/incoming/route";

// Forward POST requests to the incoming webhook
export async function POST(request: NextRequest) {
  return IncomingWebhookPOST(request);
}

// Forward GET requests to the incoming webhook
export async function GET(request: NextRequest) {
  return IncomingWebhookGET(request);
}
