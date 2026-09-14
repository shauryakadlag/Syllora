import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import {
  createAdminResource,
  validateResourceInput,
} from "@/lib/services/admin-resources";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/resources
 *
 * Creates a new learning resource in the catalog.
 * Authenticated active administrators only.
 *
 * Security & Data Invariants:
 * 1. Requires active administrator session verified via Supabase Auth + public.is_admin().
 * 2. Strictly forces status = 'pending', verified_by = null, verified_at = null.
 * 3. Validates title, URL (http/https only), type (enum), provider, and description lengths.
 * 4. Prevents mass-assignment of moderation or verification fields.
 */
export async function POST(req: NextRequest) {
  // 1. Authoritative server-side admin check
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

  // 2. Parse request JSON body safely
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

  // 3. Server-side validation
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

  // 4. Create resource via service layer
  const result = await createAdminResource(validation.data);

  if (!result.success) {
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

  return NextResponse.json(
    {
      success: true,
      data: result.data,
    },
    { status: 201 }
  );
}
