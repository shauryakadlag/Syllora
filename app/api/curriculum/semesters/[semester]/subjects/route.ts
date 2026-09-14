import { NextResponse } from "next/server";
import { getSubjectsBySemester } from "@/lib/services/curriculum";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    semester: string;
  };
}

/**
 * GET /api/curriculum/semesters/[semester]/subjects
 *
 * Returns subjects for the requested semester number.
 * Validates that semester is an integer between 1 and 8.
 */
export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  const rawSemester = params?.semester;

  // Strict integer check 1-8
  if (!rawSemester || !/^[1-8]$/.test(rawSemester)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid semester number. Must be an integer between 1 and 8.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const semesterNumber = parseInt(rawSemester, 10);
    const result = await getSubjectsBySemester(semesterNumber);

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
