import { SupabaseClient } from "@supabase/supabase-js";
import { Database, ReportReason, ReportStatus, ResourceStatus } from "@/types/database";
import { getSupabaseAdminServerClient } from "../supabase/admin-server";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AdminReportResource {
  id: string;
  title: string;
  url: string;
  status: ResourceStatus;
  provider: string | null;
}

export interface AdminReportSummary {
  id: string;
  resourceId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resource: AdminReportResource | null;
}

export interface AdminReportCounts {
  total: number;
  open: number;
  resolved: number;
  dismissed: number;
}

export interface AdminReportListResult {
  reports: AdminReportSummary[];
  counts: AdminReportCounts;
}

export type AdminReportServiceResult<T> =
  | { success: true; data: T; error: null }
  | {
      success: false;
      data: null;
      error: {
        code: "BAD_REQUEST" | "NOT_FOUND" | "DATABASE_ERROR" | "INTERNAL_ERROR";
        message: string;
      };
    };

/**
 * Retrieves all student resource reports for the admin dashboard.
 * Requires an authenticated client with an active admin session.
 * Ordered deterministically by created_at DESC (newest reports first).
 */
export async function getAdminResourceReports(
  client?: SupabaseClient<Database>
): Promise<AdminReportServiceResult<AdminReportListResult>> {
  try {
    const supabase = client || getSupabaseAdminServerClient();

    const { data, error } = await supabase
      .from("resource_reports")
      .select(`
        id,
        resource_id,
        reason,
        description,
        status,
        created_at,
        resolved_at,
        resolved_by,
        resources (
          id,
          title,
          url,
          status,
          provider
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to retrieve resource reports: ${error.message}`,
        },
      };
    }

    const rows = data || [];

    const counts: AdminReportCounts = {
      total: rows.length,
      open: 0,
      resolved: 0,
      dismissed: 0,
    };

    const reports: AdminReportSummary[] = rows.map((row) => {
      if (row.status === "open") counts.open++;
      else if (row.status === "resolved") counts.resolved++;
      else if (row.status === "dismissed") counts.dismissed++;

      const res = row.resources as {
        id: string;
        title: string;
        url: string;
        status: ResourceStatus;
        provider: string | null;
      } | null;

      return {
        id: row.id,
        resourceId: row.resource_id,
        reason: row.reason,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        resolvedBy: row.resolved_by,
        resource: res
          ? {
              id: res.id,
              title: res.title,
              url: res.url,
              status: res.status,
              provider: res.provider,
            }
          : null,
      };
    });

    return {
      success: true,
      data: {
        reports,
        counts,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected internal error";
    return {
      success: false,
      data: null,
      error: { code: "INTERNAL_ERROR", message },
    };
  }
}

/**
 * Resolves an open resource report.
 * State transition: 'open' -> 'resolved'
 * Sets resolved_by to adminId and resolved_at to current server ISO timestamp.
 * Strictly rejects any transition if report is not 'open'.
 *
 * Atomicity: The database UPDATE conditionally requires id = $id AND status = 'open'
 * in a single atomic statement to prevent read-then-write race conditions.
 *
 * Invariant: Does NOT modify the target resource status, verification, or relationships.
 */
export async function resolveAdminResourceReport(
  reportId: string,
  adminId: string,
  client?: SupabaseClient<Database>
): Promise<AdminReportServiceResult<AdminReportSummary>> {
  if (!reportId || !UUID_REGEX.test(reportId.trim())) {
    return {
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid report ID format. Must be a valid UUID." },
    };
  }

  if (!adminId || !UUID_REGEX.test(adminId.trim())) {
    return {
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid admin ID format. Must be a valid UUID." },
    };
  }

  const cleanReportId = reportId.trim();
  const cleanAdminId = adminId.trim();

  try {
    const supabase = client || getSupabaseAdminServerClient();
    const resolvedAt = new Date().toISOString();

    // Atomic conditional UPDATE: requires id = target AND status = 'open'
    const { data, error: updateError } = await supabase
      .from("resource_reports")
      .update({
        status: "resolved",
        resolved_at: resolvedAt,
        resolved_by: cleanAdminId,
      })
      .eq("id", cleanReportId)
      .eq("status", "open")
      .select(`
        id,
        resource_id,
        reason,
        description,
        status,
        created_at,
        resolved_at,
        resolved_by,
        resources (
          id,
          title,
          url,
          status,
          provider
        )
      `)
      .maybeSingle();

    if (updateError) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to resolve report: ${updateError.message}`,
        },
      };
    }

    // If zero rows updated, check whether report is nonexistent or already resolved/dismissed
    if (!data) {
      const { data: existing, error: fetchError } = await supabase
        .from("resource_reports")
        .select("id, status")
        .eq("id", cleanReportId)
        .maybeSingle();

      if (fetchError) {
        return {
          success: false,
          data: null,
          error: { code: "DATABASE_ERROR", message: `Failed to verify report state: ${fetchError.message}` },
        };
      }

      if (!existing) {
        return {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: `Resource report with ID '${cleanReportId}' was not found.` },
        };
      }

      return {
        success: false,
        data: null,
        error: {
          code: "BAD_REQUEST",
          message: `Cannot resolve report. Current status is '${existing.status}'. Only 'open' reports can be resolved.`,
        },
      };
    }

    const res = data.resources as {
      id: string;
      title: string;
      url: string;
      status: ResourceStatus;
      provider: string | null;
    } | null;

    return {
      success: true,
      data: {
        id: data.id,
        resourceId: data.resource_id,
        reason: data.reason,
        description: data.description,
        status: data.status,
        createdAt: data.created_at,
        resolvedAt: data.resolved_at,
        resolvedBy: data.resolved_by,
        resource: res
          ? {
              id: res.id,
              title: res.title,
              url: res.url,
              status: res.status,
              provider: res.provider,
            }
          : null,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected internal error";
    return {
      success: false,
      data: null,
      error: { code: "INTERNAL_ERROR", message },
    };
  }
}

/**
 * Dismisses an open resource report without modifying the target resource.
 * State transition: 'open' -> 'dismissed'
 * Sets resolved_by to adminId and resolved_at to current server ISO timestamp.
 * Strictly rejects any transition if report is not 'open'.
 *
 * Atomicity: The database UPDATE conditionally requires id = $id AND status = 'open'
 * in a single atomic statement to prevent read-then-write race conditions.
 *
 * Invariant: Does NOT modify the target resource status, verification, or relationships.
 */
export async function dismissAdminResourceReport(
  reportId: string,
  adminId: string,
  client?: SupabaseClient<Database>
): Promise<AdminReportServiceResult<AdminReportSummary>> {
  if (!reportId || !UUID_REGEX.test(reportId.trim())) {
    return {
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid report ID format. Must be a valid UUID." },
    };
  }

  if (!adminId || !UUID_REGEX.test(adminId.trim())) {
    return {
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid admin ID format. Must be a valid UUID." },
    };
  }

  const cleanReportId = reportId.trim();
  const cleanAdminId = adminId.trim();

  try {
    const supabase = client || getSupabaseAdminServerClient();
    const resolvedAt = new Date().toISOString();

    // Atomic conditional UPDATE: requires id = target AND status = 'open'
    const { data, error: updateError } = await supabase
      .from("resource_reports")
      .update({
        status: "dismissed",
        resolved_at: resolvedAt,
        resolved_by: cleanAdminId,
      })
      .eq("id", cleanReportId)
      .eq("status", "open")
      .select(`
        id,
        resource_id,
        reason,
        description,
        status,
        created_at,
        resolved_at,
        resolved_by,
        resources (
          id,
          title,
          url,
          status,
          provider
        )
      `)
      .maybeSingle();

    if (updateError) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to dismiss report: ${updateError.message}`,
        },
      };
    }

    // If zero rows updated, check whether report is nonexistent or already resolved/dismissed
    if (!data) {
      const { data: existing, error: fetchError } = await supabase
        .from("resource_reports")
        .select("id, status")
        .eq("id", cleanReportId)
        .maybeSingle();

      if (fetchError) {
        return {
          success: false,
          data: null,
          error: { code: "DATABASE_ERROR", message: `Failed to verify report state: ${fetchError.message}` },
        };
      }

      if (!existing) {
        return {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: `Resource report with ID '${cleanReportId}' was not found.` },
        };
      }

      return {
        success: false,
        data: null,
        error: {
          code: "BAD_REQUEST",
          message: `Cannot dismiss report. Current status is '${existing.status}'. Only 'open' reports can be dismissed.`,
        },
      };
    }

    const res = data.resources as {
      id: string;
      title: string;
      url: string;
      status: ResourceStatus;
      provider: string | null;
    } | null;

    return {
      success: true,
      data: {
        id: data.id,
        resourceId: data.resource_id,
        reason: data.reason,
        description: data.description,
        status: data.status,
        createdAt: data.created_at,
        resolvedAt: data.resolved_at,
        resolvedBy: data.resolved_by,
        resource: res
          ? {
              id: res.id,
              title: res.title,
              url: res.url,
              status: res.status,
              provider: res.provider,
            }
          : null,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected internal error";
    return {
      success: false,
      data: null,
      error: { code: "INTERNAL_ERROR", message },
    };
  }
}
