import { NextRequest, NextResponse } from "next/server";
import { verifyStudentSession } from "@/lib/auth/student";
import {
  generateAIAssistance,
  ALLOWED_AI_MODES,
  UUID_REGEX,
} from "@/lib/services/ai-assist";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/assist
 *
 * Provides targeted AI learning assistance (explain, example, quiz) for a published Learning Topic.
 * Requires an authenticated student session.
 */
export async function POST(request: NextRequest) {
  try {
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

    // 3. Request Body Parsing & Strict Validation
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

    // 4. Generate AI Assistance via Server-Side Service
    const result = await generateAIAssistance(topicId.trim(), mode.trim());

    if (!result.success) {
      const statusCode =
        result.error.code === "NOT_FOUND"
          ? 404
          : result.error.code === "UNPUBLISHED_TOPIC" ||
            result.error.code === "INVALID_INPUT"
          ? 400
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
