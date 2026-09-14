import { getSupabaseServerClient } from "../supabase/server";

// ==============================================================================
// Service Result & Error Types
// ==============================================================================

export interface ServiceError {
  code: "BAD_REQUEST" | "DATABASE_ERROR";
  message: string;
}

export type ServiceResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ServiceError };

// ==============================================================================
// Domain Models for Search
// ==============================================================================

export type SearchResultType =
  | "subject"
  | "unit"
  | "syllabus_item"
  | "learning_topic"
  | "resource";

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  url: string;
  courseCode?: string;
  subjectName?: string;
  unitOrder?: number;
  provider?: string;
  resourceType?: string;
  externalUrl?: string;
}

export const MAX_QUERY_LENGTH = 100;
export const MIN_QUERY_LENGTH = 2;

/**
 * Sanitizes a search query string.
 * Strips PostgREST filter delimiter characters and escapes SQL LIKE wildcards.
 */
export function sanitizeSearchQuery(raw: string): string {
  if (!raw) return "";
  // Collapse whitespace
  let cleaned = raw.trim().replace(/\s+/g, " ");
  // Strip characters that break PostgREST URL filter parsing (, ( ) [ ] " ')
  cleaned = cleaned.replace(/[,()\[\]"']/g, "");
  // Escape wildcard characters % and _ for SQL LIKE
  cleaned = cleaned.replace(/[%_\\]/g, "\\$&");
  return cleaned;
}

/**
 * Performs server-side search across all 5 existing Syllora content layers:
 * 1. Subjects (course code, subject name)
 * 2. Units (unit name, unit number)
 * 3. Learning Topics (normalized title - published only)
 * 4. Verified Learning Resources (title, provider - verified only)
 * 5. Official Syllabus Items (official text)
 *
 * Strict Security Rules:
 * - Operates under public anon Supabase client (Row Level Security enforced).
 * - Only published learning topics are returned.
 * - Only verified resources are returned.
 * - Input is validated and sanitized against injection and excessive lengths.
 */
export async function searchContent(
  rawQuery: string
): Promise<ServiceResult<SearchResultItem[]>> {
  if (typeof rawQuery !== "string") {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: "Search query parameter must be a string.",
      },
    };
  }

  if (rawQuery.length > MAX_QUERY_LENGTH) {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: `Search query exceeds maximum length of ${MAX_QUERY_LENGTH} characters.`,
      },
    };
  }

  const sanitized = sanitizeSearchQuery(rawQuery);

  // Queries shorter than MIN_QUERY_LENGTH return empty list immediately without hitting DB
  if (sanitized.length < MIN_QUERY_LENGTH) {
    return {
      success: true,
      data: [],
      error: null,
    };
  }

  try {
    const supabase = getSupabaseServerClient();
    const likePattern = `%${sanitized}%`;

    // 1. Subjects Query
    const subjectsQuery = supabase
      .from("subjects")
      .select("id, course_code, subject_name, semesters!inner(semester_number)")
      .or(`course_code.ilike.${likePattern},subject_name.ilike.${likePattern}`)
      .limit(5);

    // 2. Units Query
    const unitsQuery = supabase
      .from("units")
      .select("id, unit_number, unit_order, unit_name, subjects!inner(course_code, subject_name)")
      .or(`unit_name.ilike.${likePattern},unit_number.ilike.${likePattern}`)
      .order("unit_order", { ascending: true })
      .limit(5);

    // 3. Learning Topics Query (Published topics only)
    const topicsQuery = supabase
      .from("learning_topics")
      .select(`
        id,
        normalized_title,
        status,
        syllabus_items!inner (
          units!inner (
            unit_order,
            subjects!inner (course_code, subject_name)
          )
        )
      `)
      .eq("status", "published")
      .ilike("normalized_title", likePattern)
      .limit(5);

    // 4. Verified Resources Query (Verified resources on published topics only)
    const resourcesQuery = supabase
      .from("resources")
      .select(`
        id,
        title,
        url,
        type,
        provider,
        status,
        topic_resources!inner (
          learning_topics!inner (
            status,
            syllabus_items!inner (
              units!inner (
                unit_order,
                subjects!inner (course_code, subject_name)
              )
            )
          )
        )
      `)
      .eq("status", "verified")
      .or(`title.ilike.${likePattern},provider.ilike.${likePattern}`)
      .limit(5);

    // 5. Syllabus Items Query
    const itemsQuery = supabase
      .from("syllabus_items")
      .select(`
        id,
        official_text,
        original_order,
        units!inner (
          unit_order,
          subjects!inner (course_code, subject_name)
        )
      `)
      .ilike("official_text", likePattern)
      .limit(5);

    // Run all 5 searches in parallel
    const [subjRes, unitRes, topicRes, resRes, itemRes] = await Promise.all([
      subjectsQuery,
      unitsQuery,
      topicsQuery,
      resourcesQuery,
      itemsQuery,
    ]);

    const results: SearchResultItem[] = [];

    // Process Subjects
    if (subjRes.data) {
      for (const s of subjRes.data) {
        results.push({
          id: s.id,
          type: "subject",
          title: s.subject_name,
          subtitle: `Subject · ${s.course_code}`,
          url: `/subject/${s.course_code}`,
          courseCode: s.course_code,
          subjectName: s.subject_name,
        });
      }
    }

    // Process Units
    if (unitRes.data) {
      for (const u of unitRes.data) {
        const sub = u.subjects as unknown as { course_code: string; subject_name: string } | null;
        const courseCode = sub?.course_code || "";
        const subjectName = sub?.subject_name || "";
        results.push({
          id: u.id,
          type: "unit",
          title: `Unit ${u.unit_order} — ${u.unit_name}`,
          subtitle: `Unit ${u.unit_order} · ${subjectName}`,
          url: courseCode ? `/subject/${courseCode}#unit-${u.unit_order}` : "/#curriculum",
          courseCode,
          subjectName,
          unitOrder: u.unit_order,
        });
      }
    }

    // Process Learning Topics
    if (topicRes.data) {
      for (const t of topicRes.data) {
        const si = t.syllabus_items as unknown as {
          units?: {
            unit_order?: number;
            subjects?: { course_code?: string; subject_name?: string };
          };
        } | null;
        const sub = si?.units?.subjects;
        const courseCode = sub?.course_code || "";
        const subjectName = sub?.subject_name || "";
        const unitOrder = si?.units?.unit_order;

        results.push({
          id: t.id,
          type: "learning_topic",
          title: t.normalized_title,
          subtitle: `Learning Topic · ${subjectName}`,
          url: courseCode ? `/subject/${courseCode}#topic-${t.id}` : "/#curriculum",
          courseCode,
          subjectName,
          unitOrder,
        });
      }
    }

    // Process Verified Resources
    if (resRes.data) {
      for (const r of resRes.data) {
        const trs = r.topic_resources as unknown as Array<{
          learning_topics?: {
            status?: string;
            syllabus_items?: {
              units?: {
                unit_order?: number;
                subjects?: { course_code?: string; subject_name?: string };
              };
            };
          };
        }> | null;

        const firstTopic = trs?.[0]?.learning_topics;
        const sub = firstTopic?.syllabus_items?.units?.subjects;
        const courseCode = sub?.course_code || "";
        const subjectName = sub?.subject_name || "";
        const providerName = r.provider || "Curated";
        const typeFormatted = r.type
          ? r.type.charAt(0).toUpperCase() + r.type.slice(1)
          : "Resource";

        results.push({
          id: r.id,
          type: "resource",
          title: r.title,
          subtitle: `Resource · ${providerName} · ${typeFormatted}`,
          url: courseCode ? `/subject/${courseCode}#resource-${r.id}` : "/#curriculum",
          courseCode,
          subjectName,
          provider: r.provider || undefined,
          resourceType: r.type,
          externalUrl: r.url,
        });
      }
    }

    // Process Syllabus Items
    if (itemRes.data) {
      for (const item of itemRes.data) {
        const u = item.units as unknown as {
          unit_order?: number;
          subjects?: { course_code?: string; subject_name?: string };
        } | null;
        const sub = u?.subjects;
        const courseCode = sub?.course_code || "";
        const subjectName = sub?.subject_name || "";
        const unitOrder = u?.unit_order || 1;

        results.push({
          id: item.id,
          type: "syllabus_item",
          title: item.official_text,
          subtitle: `Syllabus Item · ${subjectName} · Unit ${unitOrder}`,
          url: courseCode ? `/subject/${courseCode}#item-${item.id}` : "/#curriculum",
          courseCode,
          subjectName,
          unitOrder,
        });
      }
    }

    return {
      success: true,
      data: results,
      error: null,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An error occurred during search.";
    return {
      success: false,
      data: null,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to perform search query.",
      },
    };
  }
}
