import { NextRequest, NextResponse } from "next/server";
import { verifyStudentSession } from "@/lib/auth/student";
import {
  markTopicCompleted,
  markTopicIncomplete,
  UUID_REGEX,
} from "@/lib/services/student-progress";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    topicId: string;
  };
}

/**
 * POST /api/student/progress/[topicId]
 *
 * Marks a published learning topic as completed for the authenticated student.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
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

    const authResult = await verifyStudentSession();

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Student authentication required to update progress.",
          },
        },
        { status: 401 }
      );
    }

    const { topicId } = params;
    if (!topicId || !UUID_REGEX.test(topicId)) {
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

    const result = await markTopicCompleted(authResult.user.id, topicId);

    if (!result.success) {
      const statusCode =
        result.error.code === "NOT_FOUND"
          ? 404
          : result.error.code === "UNPUBLISHED_TOPIC" || result.error.code === "INVALID_ID"
          ? 400
          : 500;

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
      data: {
        topicId: result.topicId,
        completed: result.completed,
        alreadyCompleted: result.alreadyCompleted,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to mark topic as completed.",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student/progress/[topicId]
 *
 * Removes completion status for a learning topic (undo).
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
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

    const authResult = await verifyStudentSession();

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Student authentication required to update progress.",
          },
        },
        { status: 401 }
      );
    }

    const { topicId } = params;
    if (!topicId || !UUID_REGEX.test(topicId)) {
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

    const result = await markTopicIncomplete(authResult.user.id, topicId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        topicId: result.topicId,
        completed: false,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to remove topic completion.",
        },
      },
      { status: 500 }
    );
  }
}
