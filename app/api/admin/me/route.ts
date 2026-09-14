import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/me
 *
 * Protected administrative status check endpoint.
 *
 * Response Codes:
 * - 200 OK: Caller is an active authenticated administrator.
 * - 401 Unauthorized: Caller is not authenticated (missing/expired session).
 * - 403 Forbidden: Caller is authenticated, but not an active administrator.
 */
export async function GET() {
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

  return NextResponse.json({
    success: true,
    data: {
      user: authResult.user,
      admin: authResult.admin,
    },
  });
}
