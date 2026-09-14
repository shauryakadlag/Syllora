import { NextResponse } from "next/server";
import { verifyStudentSession } from "@/lib/auth/student";

export const dynamic = "force-dynamic";

/**
 * GET /api/student/auth/me
 *
 * Checks student authentication state based on session cookies.
 */
export async function GET() {
  try {
    const authResult = await verifyStudentSession();

    return NextResponse.json({
      success: true,
      data: authResult,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to determine student session status.",
        },
      },
      { status: 500 }
    );
  }
}
