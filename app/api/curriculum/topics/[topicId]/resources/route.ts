import { NextResponse } from "next/server";
import { getResourcesByTopicId } from "@/lib/services/resources";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    topicId: string;
  };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/curriculum/topics/[topicId]/resources
 *
 * Returns verified learning resources associated with the given learning topic ID.
 * Strictly validates that topicId is a valid UUID, enforces verified status,
 * and handles missing parent topics gracefully with standard error contracts.
 */
export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  const rawTopicId = params?.topicId;

  if (!rawTopicId || typeof rawTopicId !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Topic ID is required.",
        },
      },
      { status: 400 }
    );
  }

  const cleanId = rawTopicId.trim();
  if (!UUID_REGEX.test(cleanId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid learning topic ID format. Must be a valid UUID.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await getResourcesByTopicId(cleanId);

    if (!result.success) {
      const status =
        result.error.code === "NOT_FOUND"
          ? 404
          : result.error.code === "BAD_REQUEST"
          ? 400
          : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
