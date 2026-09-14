import { getSupabaseServerClient } from "../supabase/server";
import { validateReportInput, UUID_REGEX } from "../validation/reports";
import { ReportReason } from "@/types/database";

export interface ReportServiceError {
  code: "BAD_REQUEST" | "NOT_FOUND" | "DATABASE_ERROR";
  message: string;
  errors?: Record<string, string>;
}

export type ReportServiceResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ReportServiceError };

export interface CreatedReportSummary {
  id: string;
  resourceId: string;
  reason: ReportReason;
  createdAt: string;
}

/**
 * Submits an anonymous report for a verified learning resource.
 *
 * Enforces:
 * 1. UUID validation on resourceId.
 * 2. Strict input validation on report reason and description.
 * 3. Verified resource existence check:
 *    - Rejects nonexistent resources (NOT_FOUND).
 *    - Rejects unverified (pending or rejected) resources (BAD_REQUEST).
 * 4. Anonymous INSERT into resource_reports under PostgreSQL Row Level Security (RLS).
 * 5. Zero service-role credential usage.
 */
export async function createResourceReport(
  resourceId: string,
  input: unknown
): Promise<ReportServiceResult<CreatedReportSummary>> {
  // 1. Validate resourceId format
  if (!resourceId || typeof resourceId !== "string") {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: "Resource ID is required.",
      },
    };
  }

  const cleanResourceId = resourceId.trim();
  if (!UUID_REGEX.test(cleanResourceId)) {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: "Invalid resource ID format. Must be a valid UUID.",
      },
    };
  }

  // 2. Validate report payload
  const validation = validateReportInput(input);
  if (!validation.valid) {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: Object.values(validation.errors)[0] || "Invalid report payload.",
        errors: validation.errors,
      },
    };
  }

  try {
    const supabase = getSupabaseServerClient();

    // 3. Verify target resource exists and is verified
    const { data: resource, error: resourceError } = await supabase
      .from("resources")
      .select("id, status")
      .eq("id", cleanResourceId)
      .maybeSingle();

    if (resourceError) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to verify resource status. Please try again.",
        },
      };
    }

    if (!resource) {
      return {
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Learning resource with ID '${cleanResourceId}' was not found.`,
        },
      };
    }

    if (resource.status !== "verified") {
      return {
        success: false,
        data: null,
        error: {
          code: "BAD_REQUEST",
          message: "Only verified resources can be reported.",
        },
      };
    }

    // 4. Insert report record under RLS
    const reportId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from("resource_reports")
      .insert({
        id: reportId,
        resource_id: cleanResourceId,
        reason: validation.data.reason,
        description: validation.data.description,
      });

    if (insertError) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: "Unable to submit report at this time. Please try again.",
        },
      };
    }

    return {
      success: true,
      data: {
        id: reportId,
        resourceId: cleanResourceId,
        reason: validation.data.reason,
        createdAt: new Date().toISOString(),
      },
      error: null,
    };
  } catch {
    return {
      success: false,
      data: null,
      error: {
        code: "DATABASE_ERROR",
        message: "An unexpected error occurred while submitting your report.",
      },
    };
  }
}
