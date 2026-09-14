import { NextResponse } from "next/server";
import { getSupabaseStudentServerClient } from "@/lib/supabase/student-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/student/auth/logout
 *
 * Terminates the student session and clears session cookies.
 */
export async function POST(request: Request) {
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

    const supabase = getSupabaseStudentServerClient();
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      data: {
        message: "Signed out successfully.",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to sign out.",
        },
      },
      { status: 500 }
    );
  }
}
