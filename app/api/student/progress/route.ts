import { NextResponse } from "next/server";
import { verifyStudentSession } from "@/lib/auth/student";
import { getStudentCompletedTopicIds } from "@/lib/services/student-progress";

export const dynamic = "force-dynamic";

/**
 * GET /api/student/progress
 *
 * Retrieves all completed topic IDs for the authenticated student.
 */
export async function GET() {
  try {
    const authResult = await verifyStudentSession();

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Student authentication required to access progress.",
          },
        },
        { status: 401 }
      );
    }

    const completedTopicIds = await getStudentCompletedTopicIds(authResult.user.id);

    return NextResponse.json({
      success: true,
      data: {
        completedTopicIds,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve student progress.",
        },
      },
      { status: 500 }
    );
  }
}
