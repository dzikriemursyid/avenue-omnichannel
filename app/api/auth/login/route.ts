// Login API Route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signInWithEmail } from "@/lib/actions/auth";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/api-error";
import { validateRequest } from "@/lib/utils/api-validation";
import { rateLimit } from "@/lib/middleware/rate-limit";

// Login request schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Apply rate limiting: 5 attempts per minute
const loginRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts
  message: "Too many login attempts, please try again later",
});

export async function POST(request: NextRequest) {
  return loginRateLimit(request, async () => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validatedData = await validateRequest(body, loginSchema);

      // Create FormData for compatibility with existing action
      const formData = new FormData();
      formData.append("email", validatedData.email);
      formData.append("password", validatedData.password);

      // Call existing auth action
      const result = await signInWithEmail(formData);

      if (!result.success) {
        return NextResponse.json(errorResponse(result.message, result.errors), { status: 400 });
      }

      // Success response
      return NextResponse.json(
        successResponse("Successfully signed in", {
          message: result.message,
        }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
