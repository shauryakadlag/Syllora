import { NextResponse } from "next/server";
import { getSupabaseAdminServerClient } from "@/lib/supabase/admin-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/auth/login
 *
 * Authenticates an administrator using Supabase Auth and validates active admin status.
 *
 * Security Controls:
 * 1. Safe generic error message for invalid credentials, non-existent accounts, and non-admin users
 *    to prevent email enumeration or role discovery.
 * 2. If a non-admin or inactive-admin user authenticates via Supabase Auth, their session is
 *    immediately revoked/cleared with `signOut()` before returning the generic 401 error.
 * 3. Session cookies are automatically set on the response by `@supabase/ssr`.
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

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Request body must be a valid JSON object.",
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = body as { email?: unknown; password?: unknown };

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Both email and password are required.",
          },
        },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Email must not be empty.",
          },
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminServerClient();

    // 1. Authenticate credentials via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Authorize: verify user exists in public.admins with is_active = true
    const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");

    if (rpcError || isAdmin !== true) {
      // User authenticated in auth.users, but is NOT an active admin.
      // Immediately revoke session and clear cookies.
      await supabase.auth.signOut();

      // Return generic 401 to prevent role/account discovery
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid email or password.",
          },
        },
        { status: 401 }
      );
    }

    // 3. Retrieve admin role
    const { data: adminRow } = await supabase
      .from("admins")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        role: adminRow?.role || "moderator",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "An unexpected error occurred during authentication.",
        },
      },
      { status: 500 }
    );
  }
}
