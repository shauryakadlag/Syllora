import { getSupabaseServerClient } from "../supabase/server";

// ==============================================================================
// Service Result & Error Types
// ==============================================================================

export interface ServiceError {
  code: "BAD_REQUEST" | "NOT_FOUND" | "DATABASE_ERROR";
  message: string;
}

export type ServiceResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ServiceError };

// ==============================================================================
// Domain Models for Learning Resources
// ==============================================================================

export type ResourceType =
  | "video"
  | "article"
  | "pdf"
  | "playlist"
  | "documentation";

export interface ResourceSummary {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  provider: string | null;
  description: string | null;
  status: "verified";
  rankingScore: number;
  isFeatured: boolean;
  assignedAt: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a URL uses safe HTTP or HTTPS protocol.
 * Prevents javascript:, data:, or other malicious URI schemes.
 */
function isSafeUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ==============================================================================
// 1. Get Resources by Learning Topic ID
// ==============================================================================

/**
 * Retrieves all verified resources associated with a published learning topic.
 *
 * Validates that topicId is a valid UUID, confirms the topic exists and is published,
 * and returns verified resources ordered deterministically:
 *   1. Featured resources first (is_featured DESC)
 *   2. Higher ranking score (ranking_score DESC)
 *   3. Title alphabetically (title ASC)
 */
export async function getResourcesByTopicId(
  topicId: string
): Promise<ServiceResult<ResourceSummary[]>> {
  if (!topicId || typeof topicId !== "string") {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: "Topic ID is required.",
      },
    };
  }

  const cleanId = topicId.trim();
  if (!UUID_REGEX.test(cleanId)) {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: "Invalid learning topic ID format. Must be a valid UUID.",
      },
    };
  }

  try {
    const supabase = getSupabaseServerClient();

    // 1. Verify that the parent learning topic exists and is published
    const { data: topic, error: topicError } = await supabase
      .from("learning_topics")
      .select("id, status")
      .eq("id", cleanId)
      .eq("status", "published")
      .maybeSingle();

    if (topicError) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to verify learning topic: ${topicError.message}`,
        },
      };
    }

    if (!topic) {
      return {
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Learning topic with ID '${cleanId}' was not found.`,
        },
      };
    }

    // 2. Fetch associated resources through topic_resources junction table
    const { data, error } = await supabase
      .from("topic_resources")
      .select(`
        ranking_score,
        is_featured,
        assigned_at,
        resources (
          id,
          title,
          url,
          type,
          provider,
          description,
          status
        )
      `)
      .eq("learning_topic_id", cleanId);

    if (error) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to fetch resources for topic: ${error.message}`,
        },
      };
    }

    // 3. Process, sanitize, and strictly filter for verified resources
    const verifiedResources: ResourceSummary[] = [];

    for (const row of data || []) {
      const res = row.resources as {
        id: string;
        title: string;
        url: string;
        type: ResourceType;
        provider: string | null;
        description: string | null;
        status: string;
      } | null;

      // Defense-in-depth: enforce verified status even if RLS already filters
      if (!res || res.status !== "verified") {
        continue;
      }

      // Defense-in-depth: reject unsafe URI schemes (e.g. javascript:)
      if (!isSafeUrl(res.url)) {
        continue;
      }

      verifiedResources.push({
        id: res.id,
        title: res.title,
        url: res.url,
        type: res.type,
        provider: res.provider || null,
        description: res.description || null,
        status: "verified",
        rankingScore: row.ranking_score ?? 0,
        isFeatured: Boolean(row.is_featured),
        assignedAt: row.assigned_at || new Date().toISOString(),
      });
    }

    // 4. Deterministic sorting: is_featured DESC, ranking_score DESC, title ASC
    verifiedResources.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }
      if (b.rankingScore !== a.rankingScore) {
        return b.rankingScore - a.rankingScore;
      }
      return a.title.localeCompare(b.title);
    });

    return {
      success: true,
      data: verifiedResources,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected internal error";
    return {
      success: false,
      data: null,
      error: { code: "DATABASE_ERROR", message },
    };
  }
}
