import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { getSupabaseAdminServerClient } from "../supabase/admin-server";

export interface AdminUser {
  id: string;
  email: string;
}

export interface AdminProfile {
  role: "admin" | "moderator";
  isActive: boolean;
}

export type AdminAuthResult =
  | {
      authorized: true;
      user: AdminUser;
      admin: AdminProfile;
      reason?: never;
    }
  | {
      authorized: false;
      reason: "UNAUTHENTICATED" | "FORBIDDEN";
      user: AdminUser | null;
      admin: null;
    };

/**
 * Authoritatively verifies an administrator session on the server.
 *
 * Security Invariants:
 * 1. Authenticates via Supabase Auth `getUser()`, validating the cryptographically signed JWT.
 * 2. Never trusts client-side state, localStorage, or custom headers.
 * 3. Authorizes against PostgreSQL `public.is_admin()` function, which strictly verifies:
 *    `public.admins.id = auth.uid() AND public.admins.is_active = true`.
 * 4. Distinguishes unauthenticated visitors from authenticated non-admin / inactive users.
 */
export async function verifyAdminSession(
  customClient?: SupabaseClient<Database>
): Promise<AdminAuthResult> {
  try {
    const supabase = customClient || getSupabaseAdminServerClient();

    // 1. Authenticate user from session token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        authorized: false,
        reason: "UNAUTHENTICATED",
        user: null,
        admin: null,
      };
    }

    const adminUser: AdminUser = {
      id: user.id,
      email: user.email || "",
    };

    // 2. Authorize via Postgres public.is_admin() (enforcing id = auth.uid() AND is_active = true)
    const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");

    if (rpcError || isAdmin !== true) {
      return {
        authorized: false,
        reason: "FORBIDDEN",
        user: adminUser,
        admin: null,
      };
    }

    // 3. Fetch admin profile (permitted under RLS when public.is_admin() is true)
    const { data: adminRow, error: adminError } = await supabase
      .from("admins")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (adminError || !adminRow || !adminRow.is_active) {
      return {
        authorized: false,
        reason: "FORBIDDEN",
        user: adminUser,
        admin: null,
      };
    }

    return {
      authorized: true,
      user: adminUser,
      admin: {
        role: (adminRow.role as "admin" | "moderator") || "moderator",
        isActive: adminRow.is_active,
      },
    };
  } catch {
    return {
      authorized: false,
      reason: "UNAUTHENTICATED",
      user: null,
      admin: null,
    };
  }
}
