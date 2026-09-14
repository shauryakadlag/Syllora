import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { getAdminResourceReports } from "@/lib/services/admin-reports";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/resource-reports
 *
 * Lists all student resource reports along with associated resource details.
 * Ordered deterministically by created_at DESC (newest reports first).
 * Authenticated active administrators only.
 */
export async function GET(_req: NextRequest) {
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

  const result = await getAdminResourceReports();

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: result.error.code,
          message: result.error.message,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  });
}
