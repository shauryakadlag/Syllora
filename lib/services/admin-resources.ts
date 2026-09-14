import { SupabaseClient } from "@supabase/supabase-js";
import { Database, ResourceStatus, ResourceType } from "@/types/database";
import { getSupabaseAdminServerClient } from "../supabase/admin-server";

export interface AdminResourceSummary {
  id: string;
  title: string;
  url: string;
  isSafeUrl: boolean;
  type: ResourceType;
  provider: string | null;
  description: string | null;
  status: ResourceStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  topic: {
    id: string;
    normalizedTitle: string;
  } | null;
}

export interface AdminResourceCounts {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
}

export interface AdminResourceListResult {
  resources: AdminResourceSummary[];
  counts: AdminResourceCounts;
}

export type ServiceResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: { code: string; message: string } };

/**
 * Validates that a URL uses safe HTTP or HTTPS protocol.
 * Prevents javascript:, data:, or other dangerous schemes.
 */
export function isSafeUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Formats a provider or extracts the domain name safely.
 */
export function formatProvider(provider: string | null, url: string): string {
  if (provider && provider.trim().length > 0) {
    return provider.trim();
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "External";
  }
}

/**
 * Retrieves all resources for the admin dashboard.
 * Requires an authenticated client with an active admin session.
 * Ordered deterministically by created_at DESC.
 */
export async function getAdminResources(
  client?: SupabaseClient<Database>
): Promise<ServiceResult<AdminResourceListResult>> {
  try {
    const supabase = client || getSupabaseAdminServerClient();

    const { data, error } = await supabase
      .from("resources")
      .select(`
        id,
        title,
        url,
        type,
        provider,
        description,
        status,
        verified_by,
        verified_at,
        created_at,
        topic_resources (
          learning_topics (
            id,
            normalized_title
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to fetch admin resources: ${error.message}`,
        },
      };
    }

    const resources: AdminResourceSummary[] = [];
    let verifiedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    for (const row of data || []) {
      const status = row.status as ResourceStatus;
      if (status === "verified") verifiedCount++;
      else if (status === "pending") pendingCount++;
      else if (status === "rejected") rejectedCount++;

      // Extract linked topic if present
      let topic: { id: string; normalizedTitle: string } | null = null;
      if (Array.isArray(row.topic_resources) && row.topic_resources.length > 0) {
        const tr = row.topic_resources[0];
        const lt = tr.learning_topics as { id: string; normalized_title: string } | null;
        if (lt && lt.id && lt.normalized_title) {
          topic = {
            id: lt.id,
            normalizedTitle: lt.normalized_title,
          };
        }
      }

      resources.push({
        id: row.id,
        title: row.title,
        url: row.url,
        isSafeUrl: isSafeUrl(row.url),
        type: row.type as ResourceType,
        provider: formatProvider(row.provider, row.url),
        description: row.description || null,
        status,
        verifiedBy: row.verified_by || null,
        verifiedAt: row.verified_at || null,
        createdAt: row.created_at || new Date().toISOString(),
        topic,
      });
    }

    return {
      success: true,
      data: {
        resources,
        counts: {
          total: resources.length,
          verified: verifiedCount,
          pending: pendingCount,
          rejected: rejectedCount,
        },
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
