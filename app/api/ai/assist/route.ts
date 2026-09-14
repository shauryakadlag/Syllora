import { NextRequest, NextResponse } from "next/server";
import { verifyStudentSession } from "@/lib/auth/student";
import {
  generateAIAssistance,
  ALLOWED_AI_MODES,
  UUID_REGEX,
} from "@/lib/services/ai-assist";

export const dynamic = "force-dynamic";

// Lightweight in-memory rate limiter per student user ID.
// Architectural note: In multi-instance serverless deployments, rate limits apply per container instance.
// Distributed rate limiting (e.g. Redis/Upstash) is omitted to avoid external infrastructure dependencies.
const studentRequestMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(studentId: string): boolean {
  const now = Date.now();
  const timestamps = studentRequestMap.get(studentId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  recent.push(now);
  studentRequestMap.set(studentId, recent);

  // Periodic pruning if map grows large
  if (studentRequestMap.size > 1000) {
    studentRequestMap.forEach((list, key) => {
      const active = list.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (active.length === 0) {
        studentRequestMap.delete(key);
      } else {
        studentRequestMap.set(key, active);
      }
    });
  }
  return true;
}

/**
 * POST /api/ai/assist
 *
 * Provides targeted AI learning assistance (explain, example, quiz) for a published Learning Topic.
 * Requires an authenticated student session.
 */
export async function POST(request: NextRequest) {
  try {
    // 0. Bounded payload size check (max 2KB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 2048) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Request payload exceeds maximum allowed size of 2KB.",
          },
        },
        { status: 400 }
      );
    }

    // 1. CSRF defense: verify same-origin when origin header is present
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "FORBIDDEN",
                message: "Cross-origin request rejected.",
              },
            },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Invalid origin header.",
            },
          },
          { status: 403 }
        );
      }
    }

    // 2. Authoritative Server-Side Student Authentication
    const authResult = await verifyStudentSession();
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Student authentication required to access AI learning assistance.",
          },
        },
        { status: 401 }
      );
    }

    // 3. Per-student request rate limiting
    if (!checkRateLimit(authResult.user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many AI assistance requests. Please wait a minute before trying again.",
          },
        },
        { status: 429 }
      );
    }

    // 4. Request Body Parsing & Strict Validation
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Request body must be a valid JSON object.",
          },
        },
        { status: 400 }
      );
    }

    const { topicId, mode } = body as { topicId?: unknown; mode?: unknown };

    if (!topicId || typeof topicId !== "string" || !UUID_REGEX.test(topicId.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid topic ID format. Must be a valid UUID.",
          },
        },
        { status: 400 }
      );
    }

    if (!mode || typeof mode !== "string" || !ALLOWED_AI_MODES.includes(mode.trim() as any)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: `Invalid mode. Allowed modes are: ${ALLOWED_AI_MODES.join(", ")}.`,
          },
        },
        { status: 400 }
      );
    }

    // 5. Generate AI Assistance via Server-Side Service
    const result = await generateAIAssistance(topicId.trim(), mode.trim());

    if (!result.success) {
      const statusCode =
        result.error.code === "NOT_FOUND"
          ? 404
          : result.error.code === "UNPUBLISHED_TOPIC" ||
            result.error.code === "INVALID_INPUT" ||
            result.error.code === "SAFETY_BLOCKED"
          ? 400
          : result.error.code === "AI_RATE_LIMITED"
          ? 429
          : result.error.code === "AI_TIMEOUT"
          ? 504
          : result.error.code === "AI_NOT_CONFIGURED"
          ? 503
          : 502;

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "An unexpected error occurred while processing the AI assistance request.",
        },
      },
      { status: 500 }
    );
  }
}
