import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { verifyAdminResource, UUID_REGEX } from "@/lib/services/admin-resources";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/admin/resources/[id]/verify
 *
 * Transitions a resource from 'pending' to 'verified'.
 * Records verified_by (admin user ID) and verified_at (current server timestamp).
 * Authenticated active administrators only.
 */
export async function POST(
  _req: NextRequest,
  { params }: RouteParams
) {
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

  const { id } = params;
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid resource ID format. Must be a valid UUID.",
        },
      },
      { status: 400 }
    );
  }

  const result = await verifyAdminResource(id, authResult.user.id);

  if (!result.success) {
    if (result.error.code === "NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: result.error.message,
          },
        },
        { status: 404 }
      );
    }

    if (result.error.code === "BAD_REQUEST") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: result.error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
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
