import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import {
  getAdminResourceTopics,
  linkAdminResourceTopic,
  UUID_REGEX,
} from "@/lib/services/admin-resources";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/resources/[id]/topics
 *
 * Retrieves all published learning topics currently linked to this resource.
 * Authenticated active administrators only.
 */
export async function GET(
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

  const { id } = params;
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

  const result = await getAdminResourceTopics(id);

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

/**
 * POST /api/admin/resources/[id]/topics
 *
 * Links an existing resource to an existing published learning topic.
 * Invariants:
 * 1. Resource must exist (404).
 * 2. Topic must exist (404) and have status = 'published' (400).
 * 3. Duplicate link rejected with 409 Conflict.
 * 4. Created with ranking_score = 0 and is_featured = false.
 * 5. Resource verification status and audit fields remain completely untouched.
 * Authenticated active administrators only.
 */
export async function POST(
  req: NextRequest,
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

  const { id } = params;
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Malformed JSON payload.",
        },
      },
      { status: 400 }
    );
  }

  const rawTopicId =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).topicId || (body as Record<string, unknown>).learningTopicId
      : null;

  if (!rawTopicId || typeof rawTopicId !== "string" || !UUID_REGEX.test(rawTopicId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "A valid topicId UUID is required to link a topic.",
        },
      },
      { status: 400 }
    );
  }

  const result = await linkAdminResourceTopic(id, rawTopicId);

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

    if (result.error.code === "CONFLICT") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: result.error.message,
          },
        },
        { status: 409 }
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

  return NextResponse.json(
    {
      success: true,
      data: result.data,
    },
    { status: 201 }
  );
}
