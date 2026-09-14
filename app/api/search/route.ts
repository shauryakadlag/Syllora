import { NextResponse } from "next/server";
import { searchContent, MAX_QUERY_LENGTH } from "@/lib/services/search";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=...
 *
 * Public read-only endpoint for searching across the 5 Syllora content layers:
 * Subjects, Units, Syllabus Items, Learning Topics, and Verified Resources.
 *
 * Query Parameters:
 * - q: string (required query term, min 2 chars to search, max 100 chars)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q") || "";

    if (rawQuery.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: `Search query exceeds maximum length of ${MAX_QUERY_LENGTH} characters.`,
          },
        },
        { status: 400 }
      );
    }

    const result = await searchContent(rawQuery);

    if (!result.success) {
      const status = result.error.code === "BAD_REQUEST" ? 400 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal search error.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
