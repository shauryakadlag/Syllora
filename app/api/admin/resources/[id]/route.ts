import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import {
  getAdminResourceById,
  updateAdminResource,
  validateResourceInput,
  UUID_REGEX,
} from "@/lib/services/admin-resources";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/resources/[id]
 *
 * Retrieves resource details for admin inspection or editing.
 * Authenticated active administrators only.
 */
export async function GET(
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

  const result = await getAdminResourceById(id);

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

/**
 * PATCH /api/admin/resources/[id]
 *
 * Updates an existing resource's metadata (title, URL, type, provider, description).
 * Authenticated active administrators only.
 *
 * Invariants:
 * 1. Strictly protects status, verified_by, and verified_at from tampering.
 * 2. Validates lengths and URL protocols.
 * 3. Handles duplicate URL collisions cleanly (409).
 */
export async function PATCH(
  req: NextRequest,
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Malformed JSON payload.",
        },
      },
      { status: 400 }
    );
  }

  const validation = validateResourceInput(body);
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please review and correct the invalid fields.",
          details: validation.errors,
        },
      },
      { status: 400 }
    );
  }

  const result = await updateAdminResource(id, validation.data);

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

    if (result.error.code === "CONFLICT") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: result.error.message,
          },
        },
        { status: 409 }
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
