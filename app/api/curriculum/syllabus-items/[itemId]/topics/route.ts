import { NextResponse } from "next/server";
import { getTopicsBySyllabusItemId } from "@/lib/services/topics";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    itemId: string;
  };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/curriculum/syllabus-items/[itemId]/topics
 *
 * Returns published learning topics associated with the given syllabus item ID.
 * Validates that itemId is a valid UUID and handles missing parent items safely.
 */
export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  const rawItemId = params?.itemId;

  if (!rawItemId || typeof rawItemId !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Syllabus item ID is required.",
        },
      },
      { status: 400 }
    );
  }

  const cleanId = rawItemId.trim();
  if (!UUID_REGEX.test(cleanId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid syllabus item ID format. Must be a valid UUID.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await getTopicsBySyllabusItemId(cleanId);

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
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
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
