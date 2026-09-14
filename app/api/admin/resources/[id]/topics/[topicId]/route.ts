import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import {
  unlinkAdminResourceTopic,
  UUID_REGEX,
} from "@/lib/services/admin-resources";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
    topicId: string;
  };
}

/**
 * DELETE /api/admin/resources/[id]/topics/[topicId]
 *
 * Removes a topic link from a resource.
 * Invariants:
 * 1. Validates resource ID and topic ID as UUIDs.
 * 2. Deletes only the topic_resources relationship row.
 * 3. Never deletes the resource record or the learning topic record.
 * 4. Returns 404 if the link does not exist.
 * Authenticated active administrators only.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
) {
  const authResult = await verifyAdminSession();

  if (!authResult.authorized) {
    if (authResult.reason === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in as an administrator.",
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Active administrator privileges required.",
        },
      },
      { status: 403 }
    );
  }

  const { id, topicId } = params;

  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid resource ID format. Must be a valid UUID.",
        },
      },
      { status: 400 }
    );
  }

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

  const result = await unlinkAdminResourceTopic(id, topicId);

  if (!result.success) {
    if (result.error.code === "NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: result.error.message,
          },
        },
        { status: 404 }
      );
    }

    if (result.error.code === "BAD_REQUEST") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: result.error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: result.error.message,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  });
}
