import { SupabaseClient } from "@supabase/supabase-js";
import { Database, ResourceStatus, ResourceType } from "@/types/database";
import { getSupabaseAdminServerClient } from "../supabase/admin-server";

import {
  ALLOWED_RESOURCE_TYPES,
  UUID_REGEX,
  isSafeUrl,
  formatProvider,
  validateResourceInput,
  type ValidatedResourceInput,
  type ValidationResult,
} from "../validation/resources";

export {
  ALLOWED_RESOURCE_TYPES,
  UUID_REGEX,
  isSafeUrl,
  formatProvider,
  validateResourceInput,
  type ValidatedResourceInput,
  type ValidationResult,
};

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
  | {
      success: false;
      data: null;
      error: { code: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT" | "DATABASE_ERROR" | "INTERNAL_ERROR"; message: string };
    };

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

/**
 * Retrieves a single resource by its UUID for admin display or editing.
 */
export async function getAdminResourceById(
  id: string,
  client?: SupabaseClient<Database>
): Promise<ServiceResult<AdminResourceSummary>> {
  if (!id || !UUID_REGEX.test(id)) {
    return {
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid resource ID format. Must be a valid UUID." },
    };
  }

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
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        data: null,
        error: { code: "DATABASE_ERROR", message: `Failed to query resource: ${error.message}` },
      };
    }

    if (!data) {
      return {
        success: false,
        data: null,
        error: { code: "NOT_FOUND", message: `Resource with ID '${id}' was not found.` },
      };
    }

    let topic: { id: string; normalizedTitle: string } | null = null;
    if (Array.isArray(data.topic_resources) && data.topic_resources.length > 0) {
      const tr = data.topic_resources[0];
      const lt = tr.learning_topics as { id: string; normalized_title: string } | null;
      if (lt && lt.id && lt.normalized_title) {
        topic = {
          id: lt.id,
          normalizedTitle: lt.normalized_title,
        };
      }
    }

    return {
      success: true,
      data: {
        id: data.id,
        title: data.title,
        url: data.url,
        isSafeUrl: isSafeUrl(data.url),
        type: data.type as ResourceType,
        provider: formatProvider(data.provider, data.url),
        description: data.description || null,
        status: data.status as ResourceStatus,
        verifiedBy: data.verified_by || null,
        verifiedAt: data.verified_at || null,
        createdAt: data.created_at || new Date().toISOString(),
        topic,
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
 * Creates a new learning resource in the catalog.
 * Strictly forces status = 'pending', verified_by = null, verified_at = null.
 */
export async function createAdminResource(
  input: ValidatedResourceInput,
  client?: SupabaseClient<Database>
): Promise<ServiceResult<AdminResourceSummary>> {
  try {
    const supabase = client || getSupabaseAdminServerClient();

    const { data, error } = await supabase
      .from("resources")
      .insert({
        title: input.title,
        url: input.url,
        type: input.type,
        provider: input.provider,
        description: input.description,
        status: "pending",
        verified_by: null,
        verified_at: null,
      })
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
        created_at
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          data: null,
          error: {
            code: "CONFLICT",
            message: "A resource with this URL already exists in the catalog.",
          },
        };
      }
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to create resource: ${error.message}`,
        },
      };
    }

    return {
      success: true,
      data: {
        id: data.id,
        title: data.title,
        url: data.url,
        isSafeUrl: isSafeUrl(data.url),
        type: data.type as ResourceType,
        provider: formatProvider(data.provider, data.url),
        description: data.description || null,
        status: data.status as ResourceStatus,
        verifiedBy: data.verified_by || null,
        verifiedAt: data.verified_at || null,
        createdAt: data.created_at || new Date().toISOString(),
        topic: null,
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
 * Updates an existing learning resource's metadata.
 * Strictly updates only: title, url, type, provider, description.
 * Preserves existing status, verified_by, verified_at, and created_at.
 */
export async function updateAdminResource(
  id: string,
  input: ValidatedResourceInput,
  client?: SupabaseClient<Database>
): Promise<ServiceResult<AdminResourceSummary>> {
  if (!id || !UUID_REGEX.test(id)) {
    return {
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid resource ID format. Must be a valid UUID." },
    };
  }

  try {
    const supabase = client || getSupabaseAdminServerClient();

    // 1. Verify existence and retrieve current verification status
    const { data: existing, error: fetchError } = await supabase
      .from("resources")
      .select("id, status, verified_by, verified_at")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return {
        success: false,
        data: null,
        error: { code: "DATABASE_ERROR", message: `Failed to locate resource: ${fetchError.message}` },
      };
    }

    if (!existing) {
      return {
        success: false,
        data: null,
        error: { code: "NOT_FOUND", message: `Resource with ID '${id}' was not found.` },
      };
    }

    // 2. Perform metadata update preserving verification integrity
    const { data, error: updateError } = await supabase
      .from("resources")
      .update({
        title: input.title,
        url: input.url,
        type: input.type,
        provider: input.provider,
        description: input.description,
      })
      .eq("id", id)
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
      .single();

    if (updateError) {
      if (updateError.code === "23505") {
        return {
          success: false,
          data: null,
          error: {
            code: "CONFLICT",
            message: "A resource with this URL already exists in the catalog.",
          },
        };
      }
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to update resource: ${updateError.message}`,
        },
      };
    }

    let topic: { id: string; normalizedTitle: string } | null = null;
    if (Array.isArray(data.topic_resources) && data.topic_resources.length > 0) {
      const tr = data.topic_resources[0];
      const lt = tr.learning_topics as { id: string; normalized_title: string } | null;
      if (lt && lt.id && lt.normalized_title) {
        topic = {
          id: lt.id,
          normalizedTitle: lt.normalized_title,
        };
      }
    }

    return {
      success: true,
      data: {
        id: data.id,
        title: data.title,
        url: data.url,
        isSafeUrl: isSafeUrl(data.url),
        type: data.type as ResourceType,
        provider: formatProvider(data.provider, data.url),
        description: data.description || null,
        status: data.status as ResourceStatus,
        verifiedBy: data.verified_by || null,
        verifiedAt: data.verified_at || null,
        createdAt: data.created_at || new Date().toISOString(),
        topic,
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
 * Verifies a pending learning resource.
 * State transition: 'pending' -> 'verified'
 * Sets verified_by to adminId and verified_at to current server ISO timestamp.
 * Strictly rejects any transition from 'verified' or 'rejected'.
 *
 * Atomicity: The database UPDATE conditionally requires id = $id AND status = 'pending'
 * in a single atomic statement to prevent read-then-write race conditions.
 */
export async function verifyAdminResource(
  id: string,
  adminId: string,
  client?: SupabaseClient<Database>
): Promise<ServiceResult<AdminResourceSummary>> {
  if (!id || !UUID_REGEX.test(id)) {
    return {
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid resource ID format. Must be a valid UUID." },
    };
  }

  if (!adminId || !UUID_REGEX.test(adminId)) {
    return {
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid admin ID format. Must be a valid UUID." },
    };
  }

  try {
    const supabase = client || getSupabaseAdminServerClient();
    const verifiedAt = new Date().toISOString();

    // Atomic conditional UPDATE: requires id = target AND status = 'pending'
    const { data, error: updateError } = await supabase
      .from("resources")
      .update({
        status: "verified",
        verified_by: adminId,
        verified_at: verifiedAt,
      })
      .eq("id", id)
      .eq("status", "pending")
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
      .maybeSingle();

    if (updateError) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to verify resource: ${updateError.message}`,
        },
      };
    }

    // If zero rows were updated, determine whether resource is missing or non-pending
    if (!data) {
      const { data: existing, error: fetchError } = await supabase
        .from("resources")
        .select("id, status")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) {
        return {
          success: false,
          data: null,
          error: { code: "DATABASE_ERROR", message: `Failed to verify resource state: ${fetchError.message}` },
        };
      }

      if (!existing) {
        return {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: `Resource with ID '${id}' was not found.` },
        };
      }

      return {
        success: false,
        data: null,
        error: {
          code: "BAD_REQUEST",
          message: `Cannot verify resource with status '${existing.status}'. Only pending resources can be verified.`,
        },
      };
    }

    let topic: { id: string; normalizedTitle: string } | null = null;
    if (Array.isArray(data.topic_resources) && data.topic_resources.length > 0) {
      const tr = data.topic_resources[0];
      const lt = tr.learning_topics as { id: string; normalized_title: string } | null;
      if (lt && lt.id && lt.normalized_title) {
        topic = {
          id: lt.id,
          normalizedTitle: lt.normalized_title,
        };
      }
    }

    return {
      success: true,
      data: {
        id: data.id,
        title: data.title,
        url: data.url,
        isSafeUrl: isSafeUrl(data.url),
        type: data.type as ResourceType,
        provider: formatProvider(data.provider, data.url),
        description: data.description || null,
        status: data.status as ResourceStatus,
        verifiedBy: data.verified_by || null,
        verifiedAt: data.verified_at || null,
        createdAt: data.created_at || new Date().toISOString(),
        topic,
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
 * Rejects a pending learning resource.
 * State transition: 'pending' -> 'rejected'
 * Clears verified_by and verified_at to NULL.
 * Strictly rejects any transition from 'verified' or 'rejected'.
 *
 * Atomicity: The database UPDATE conditionally requires id = $id AND status = 'pending'
 * in a single atomic statement to prevent read-then-write race conditions.
 */
export async function rejectAdminResource(
  id: string,
  client?: SupabaseClient<Database>
): Promise<ServiceResult<AdminResourceSummary>> {
  if (!id || !UUID_REGEX.test(id)) {
    return {
      success: false,
      data: null,
      error: { code: "BAD_REQUEST", message: "Invalid resource ID format. Must be a valid UUID." },
    };
  }

  try {
    const supabase = client || getSupabaseAdminServerClient();

    // Atomic conditional UPDATE: requires id = target AND status = 'pending'
    const { data, error: updateError } = await supabase
      .from("resources")
      .update({
        status: "rejected",
        verified_by: null,
        verified_at: null,
      })
      .eq("id", id)
      .eq("status", "pending")
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
      .maybeSingle();

    if (updateError) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to reject resource: ${updateError.message}`,
        },
      };
    }

    // If zero rows were updated, determine whether resource is missing or non-pending
    if (!data) {
      const { data: existing, error: fetchError } = await supabase
        .from("resources")
        .select("id, status")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) {
        return {
          success: false,
          data: null,
          error: { code: "DATABASE_ERROR", message: `Failed to reject resource state: ${fetchError.message}` },
        };
      }

      if (!existing) {
        return {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: `Resource with ID '${id}' was not found.` },
        };
      }

      return {
        success: false,
        data: null,
        error: {
          code: "BAD_REQUEST",
          message: `Cannot reject resource with status '${existing.status}'. Only pending resources can be rejected.`,
        },
      };
    }

    let topic: { id: string; normalizedTitle: string } | null = null;
    if (Array.isArray(data.topic_resources) && data.topic_resources.length > 0) {
      const tr = data.topic_resources[0];
      const lt = tr.learning_topics as { id: string; normalized_title: string } | null;
      if (lt && lt.id && lt.normalized_title) {
        topic = {
          id: lt.id,
          normalizedTitle: lt.normalized_title,
        };
      }
    }

    return {
      success: true,
      data: {
        id: data.id,
        title: data.title,
        url: data.url,
        isSafeUrl: isSafeUrl(data.url),
        type: data.type as ResourceType,
        provider: formatProvider(data.provider, data.url),
        description: data.description || null,
        status: data.status as ResourceStatus,
        verifiedBy: data.verified_by || null,
        verifiedAt: data.verified_at || null,
        createdAt: data.created_at || new Date().toISOString(),
        topic,
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
