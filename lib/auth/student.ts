import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { getSupabaseStudentServerClient } from "../supabase/student-server";

export interface StudentUser {
  id: string;
  email: string;
}

export type StudentAuthResult =
  | {
      authenticated: true;
      user: StudentUser;
    }
  | {
      authenticated: false;
      user: null;
    };

/**
 * Authoritatively verifies a student session on the server.
 *
 * Security Invariants:
 * 1. Authenticates via Supabase Auth getUser(), validating the cryptographically signed JWT.
 * 2. Never trusts client-side state, localStorage, or custom headers.
 * 3. Session cookies are managed via @supabase/ssr.
 */
export async function verifyStudentSession(
  customClient?: SupabaseClient<Database>
): Promise<StudentAuthResult> {
  try {
    const supabase = customClient || getSupabaseStudentServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        authenticated: false,
        user: null,
      };
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || "",
      },
    };
  } catch {
    return {
      authenticated: false,
      user: null,
    };
  }
}
