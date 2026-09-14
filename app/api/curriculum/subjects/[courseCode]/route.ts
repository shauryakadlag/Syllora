import { NextResponse } from "next/server";
import { getSubjectByCourseCode } from "@/lib/services/curriculum";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    courseCode: string;
  };
}

/**
 * GET /api/curriculum/subjects/[courseCode]
 *
 * Returns complete subject details including units and official syllabus items.
 * Validates courseCode against safe alphanumeric pattern.
 */
export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  const rawCode = params?.courseCode;

  if (!rawCode || typeof rawCode !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Course code is required.",
        },
      },
      { status: 400 }
    );
  }

  const cleanCode = rawCode.trim();

  // Validate course code format
  if (!cleanCode || cleanCode.length > 30 || !/^[A-Za-z0-9-]+$/.test(cleanCode)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid course code format. Must be an alphanumeric code (e.g., PCC-201-COM).",
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await getSubjectByCourseCode(cleanCode);

    if (!result.success) {
      const status =
        result.error.code === "BAD_REQUEST"
          ? 400
          : result.error.code === "NOT_FOUND"
          ? 404
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
