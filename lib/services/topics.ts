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
// Domain Models for Learning Topics
// ==============================================================================

export interface LearningTopicSummary {
  id: string;
  syllabusItemId: string;
  normalizedTitle: string;
  displayOrder: number;
  status: "draft" | "published";
  createdAt: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ==============================================================================
// 1. Get Topics by Syllabus Item ID
// ==============================================================================

/**
 * Retrieves all published learning topics associated with a specific syllabus item.
 *
 * Validates that syllabusItemId is a valid UUID, confirms the syllabus item exists,
 * and returns published topics ordered deterministically by display_order.
 */
export async function getTopicsBySyllabusItemId(
  syllabusItemId: string
): Promise<ServiceResult<LearningTopicSummary[]>> {
  if (!syllabusItemId || typeof syllabusItemId !== "string") {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: "Syllabus item ID is required.",
      },
    };
  }

  const cleanId = syllabusItemId.trim();
  if (!UUID_REGEX.test(cleanId)) {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: "Invalid syllabus item ID format. Must be a valid UUID.",
      },
    };
  }

  try {
    const supabase = getSupabaseServerClient();

    // 1. Verify that the parent syllabus item exists
    const { data: item, error: itemError } = await supabase
      .from("syllabus_items")
      .select("id")
      .eq("id", cleanId)
      .maybeSingle();

    if (itemError) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to verify syllabus item: ${itemError.message}`,
        },
      };
    }

    if (!item) {
      return {
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Syllabus item with ID '${cleanId}' was not found.`,
        },
      };
    }

    // 2. Fetch published learning topics for this item
    const { data, error } = await supabase
      .from("learning_topics")
      .select("id, syllabus_item_id, normalized_title, display_order, status, created_at")
      .eq("syllabus_item_id", cleanId)
      .eq("status", "published")
      .order("display_order", { ascending: true });

    if (error) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to fetch topics for syllabus item: ${error.message}`,
        },
      };
    }

    const topics: LearningTopicSummary[] = (data || []).map((row) => ({
      id: row.id,
      syllabusItemId: row.syllabus_item_id,
      normalizedTitle: row.normalized_title,
      displayOrder: row.display_order,
      status: (row.status as "draft" | "published") || "published",
      createdAt: row.created_at || new Date().toISOString(),
    }));

    return {
      success: true,
      data: topics,
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
