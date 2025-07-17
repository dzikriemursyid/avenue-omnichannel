// GitHub Webhook Handler for Auto-Deployment
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as crypto from "crypto";

const execAsync = promisify(exec);

// Verify GitHub webhook signature
function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const computedSignature = `sha256=${hmac.digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature));
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n🚀 === GITHUB WEBHOOK RECEIVED ===");
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("📍 Request URL:", request.url);
    console.log("🌐 Request Method:", request.method);

    const body = await request.text();
    const payload = JSON.parse(body);
    
    // Get headers
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");
    const delivery = request.headers.get("x-github-delivery");

    console.log("📋 Headers:");
    console.log("  Event:", event);
    console.log("  Delivery:", delivery);
    console.log("  Signature:", signature ? "Present" : "Missing");

    // Verify webhook secret (if configured)
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyGitHubSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.log("❌ Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      console.log("✅ Webhook signature verified");
    } else if (webhookSecret) {
      console.log("⚠️ Webhook secret configured but no signature provided");
      return NextResponse.json({ error: "Signature required" }, { status: 401 });
    } else {
      console.log("⚠️ No webhook secret configured - signature verification skipped");
    }

    // Only handle push events
    if (event !== "push") {
      console.log(`ℹ️ Ignoring event: ${event}`);
      return NextResponse.json({ message: `Event ${event} ignored` }, { status: 200 });
    }

    // Extract push information
    const { ref, repository, commits, pusher } = payload;
    const branch = ref.replace("refs/heads/", "");
    const repoName = repository.name;
    const repoFullName = repository.full_name;
    const commitCount = commits.length;
    const lastCommit = commits[commits.length - 1];

    console.log("📦 Push Details:");
    console.log("  Repository:", repoFullName);
    console.log("  Branch:", branch);
    console.log("  Commit Count:", commitCount);
    console.log("  Pusher:", pusher.name);
    console.log("  Last Commit:", lastCommit.id.substring(0, 7));
    console.log("  Commit Message:", lastCommit.message);

    // Only deploy for production branch
    if (branch !== "production") {
      console.log(`ℹ️ Ignoring push to branch: ${branch} (only production triggers deployment)`);
      return NextResponse.json({ 
        message: `Push to ${branch} ignored - only production branch triggers deployment` 
      }, { status: 200 });
    }

    // Check if this is the correct repository
    if (repoName !== "avenue-omnichannel") {
      console.log(`ℹ️ Ignoring push to repository: ${repoName}`);
      return NextResponse.json({ 
        message: `Repository ${repoName} ignored` 
      }, { status: 200 });
    }

    console.log("🎯 Production deployment triggered!");
    console.log("📥 Starting deployment process...");

    // Execute deployment script
    try {
      const deploymentResult = await execAsync("/home/dzikrie/avenue-omnichannel/scripts/deploy.sh");
      
      console.log("✅ Deployment completed successfully");
      console.log("📤 Deployment output:", deploymentResult.stdout);
      
      if (deploymentResult.stderr) {
        console.log("⚠️ Deployment warnings:", deploymentResult.stderr);
      }

      // Log deployment to database or file
      await logDeployment({
        repository: repoFullName,
        branch,
        commit: lastCommit.id,
        message: lastCommit.message,
        pusher: pusher.name,
        status: "success",
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: "Deployment completed successfully",
        details: {
          repository: repoFullName,
          branch,
          commit: lastCommit.id.substring(0, 7),
          commitMessage: lastCommit.message,
          pusher: pusher.name,
          deployedAt: new Date().toISOString()
        }
      });

    } catch (deployError: any) {
      console.error("❌ Deployment failed:", deployError);
      
      // Log failed deployment
      await logDeployment({
        repository: repoFullName,
        branch,
        commit: lastCommit.id,
        message: lastCommit.message,
        pusher: pusher.name,
        status: "failed",
        error: deployError.message,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: false,
        message: "Deployment failed",
        error: deployError.message,
        details: {
          repository: repoFullName,
          branch,
          commit: lastCommit.id.substring(0, 7),
          commitMessage: lastCommit.message,
          pusher: pusher.name,
          failedAt: new Date().toISOString()
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("💥 GitHub webhook error:", error);
    return NextResponse.json({
      success: false,
      message: "Webhook processing failed",
      error: error.message
    }, { status: 500 });
  }
}

// Log deployment attempt
async function logDeployment(data: {
  repository: string;
  branch: string;
  commit: string;
  message: string;
  pusher: string;
  status: string;
  error?: string;
  timestamp: string;
}) {
  try {
    const logEntry = `[${data.timestamp}] ${data.status.toUpperCase()}: ${data.repository}@${data.branch} (${data.commit.substring(0, 7)}) by ${data.pusher}${data.error ? ` - Error: ${data.error}` : ''}\n`;
    
    const fs = require('fs').promises;
    await fs.appendFile('/var/log/github-deployments.log', logEntry);
    
    console.log("📝 Deployment logged to file");
  } catch (logError) {
    console.error("⚠️ Failed to log deployment:", logError);
  }
}

// GET endpoint for webhook verification and status
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge");
  
  // Handle GitHub webhook verification
  if (challenge) {
    console.log("🔍 GitHub webhook verification challenge");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    message: "GitHub Auto-Deployment Webhook",
    endpoint: "/api/webhooks/github",
    webhookUrl: "https://crm.avenue.id/api/webhooks/github",
    timestamp: new Date().toISOString(),
    status: "Active and ready to receive GitHub webhooks",
    features: [
      "Automatic deployment on push to production branch",
      "Webhook signature verification",
      "Deployment logging and status tracking",
      "Repository and branch filtering"
    ],
    instructions: [
      "Configure in GitHub repository settings > Webhooks",
      "Set URL to: https://crm.avenue.id/api/webhooks/github",
      "Set Content type to: application/json",
      "Select 'Just the push event'",
      "Add webhook secret (optional but recommended)"
    ],
    configuration: {
      targetRepository: "avenue-omnichannel",
      targetBranch: "production",
      deploymentScript: "/home/dzikrie/avenue-omnichannel/scripts/deploy.sh",
      logFile: "/var/log/github-deployments.log",
      webhookSecretConfigured: !!process.env.GITHUB_WEBHOOK_SECRET
    }
  });
}