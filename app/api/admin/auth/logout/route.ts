import { NextResponse } from "next/server";
import { getSupabaseAdminServerClient } from "@/lib/supabase/admin-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/auth/logout
 *
 * Terminates the authenticated admin session and clears the session cookies.
 */
export async function POST(request: Request) {
  try {
    // CSRF defense: verify same-origin when origin header is present
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

    const supabase = getSupabaseAdminServerClient();
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
