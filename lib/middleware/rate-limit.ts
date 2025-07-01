// Rate limiting middleware for API routes

import { NextRequest, NextResponse } from "next/server";
import { createApiResponse } from "@/lib/utils/api-response";
import { getClientIp } from "@/lib/utils/get-client-ip";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string; // Custom error message
}

const rateLimitStore = new Map<string, number[]>();

export function rateLimit(
  config: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: "Too many requests, please try again later",
  }
) {
  return async (request: NextRequest, next: () => Promise<Response>) => {
    const identifier = getClientIp(request);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or create request timestamps array for this identifier
    if (!rateLimitStore.has(identifier)) {
      rateLimitStore.set(identifier, []);
    }

    const timestamps = rateLimitStore.get(identifier)!;

    // Filter out timestamps outside the current window
    const recentTimestamps = timestamps.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    if (recentTimestamps.length >= config.max) {
      return NextResponse.json(createApiResponse(false, config.message || "Too many requests"), {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(config.windowMs / 1000)),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(new Date(windowStart + config.windowMs).getTime()),
        },
      });
    }

    // Add current timestamp
    recentTimestamps.push(now);
    rateLimitStore.set(identifier, recentTimestamps);

    // Continue to the handler
    const response = await next();

    // Add rate limit headers to response
    const newResponse = new NextResponse(response.body, response);
    newResponse.headers.set("X-RateLimit-Limit", String(config.max));
    newResponse.headers.set("X-RateLimit-Remaining", String(config.max - recentTimestamps.length));
    newResponse.headers.set("X-RateLimit-Reset", String(new Date(windowStart + config.windowMs).getTime()));

    return newResponse;
  };
}

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const recentTimestamps = timestamps.filter((t) => t > now - maxAge);
    if (recentTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, recentTimestamps);
    }
  }
}, 5 * 60 * 1000);
