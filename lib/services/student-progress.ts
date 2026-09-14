import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { getSupabaseStudentServerClient } from "../supabase/student-server";

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StudentProgressResult {
  completedTopicIds: string[];
}

export type TopicProgressMutationResult =
  | {
      success: true;
      topicId: string;
      completed: boolean;
      alreadyCompleted?: boolean;
    }
  | {
      success: false;
      error: {
        code: "INVALID_ID" | "NOT_FOUND" | "UNPUBLISHED_TOPIC" | "DB_ERROR";
        message: string;
      };
    };

/**
 * Retrieves all completed topic IDs for a student.
 */
export async function getStudentCompletedTopicIds(
  userId: string,
  client?: SupabaseClient<Database>
): Promise<string[]> {
  const supabase = client || getSupabaseStudentServerClient();

  const { data, error } = await supabase
    .from("student_topic_progress")
    .select("topic_id")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.topic_id);
}

/**
 * Marks a published learning topic as completed for the authenticated student.
 * Idempotent: returns success if already completed.
 */
export async function markTopicCompleted(
  userId: string,
  topicId: string,
  client?: SupabaseClient<Database>
): Promise<TopicProgressMutationResult> {
  if (!topicId || !UUID_REGEX.test(topicId)) {
    return {
      success: false,
      error: {
        code: "INVALID_ID",
        message: "Invalid topic ID format. Must be a valid UUID.",
      },
    };
  }

  const supabase = client || getSupabaseStudentServerClient();

  // 1. Verify topic exists and is published
  const { data: topic, error: topicError } = await supabase
    .from("learning_topics")
    .select("id, status")
    .eq("id", topicId)
    .maybeSingle();

  if (topicError || !topic) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Learning topic not found.",
      },
    };
  }

  if (topic.status !== "published") {
    return {
      success: false,
      error: {
        code: "UNPUBLISHED_TOPIC",
        message: "Only published learning topics can be marked as completed.",
      },
    };
  }

  // 2. Insert into student_topic_progress
  const { error: insertError } = await supabase
    .from("student_topic_progress")
    .insert({
      user_id: userId,
      topic_id: topicId,
    });

  if (insertError) {
    // Postgres 23505 = unique_violation (already completed)
    if (insertError.code === "23505") {
      return {
        success: true,
        topicId,
        completed: true,
        alreadyCompleted: true,
      };
    }

    return {
      success: false,
      error: {
        code: "DB_ERROR",
        message: insertError.message || "Failed to mark topic as completed.",
      },
    };
  }

  return {
    success: true,
    topicId,
    completed: true,
    alreadyCompleted: false,
  };
}

/**
 * Removes completion status for a learning topic (undo).
 * Idempotent: returns success even if not previously completed.
 */
export async function markTopicIncomplete(
  userId: string,
  topicId: string,
  client?: SupabaseClient<Database>
): Promise<TopicProgressMutationResult> {
  if (!topicId || !UUID_REGEX.test(topicId)) {
    return {
      success: false,
      error: {
        code: "INVALID_ID",
        message: "Invalid topic ID format. Must be a valid UUID.",
      },
    };
  }

  const supabase = client || getSupabaseStudentServerClient();

  const { error } = await supabase
    .from("student_topic_progress")
    .delete()
    .eq("user_id", userId)
    .eq("topic_id", topicId);

  if (error) {
    return {
      success: false,
      error: {
        code: "DB_ERROR",
        message: error.message || "Failed to remove topic completion.",
      },
    };
  }

  return {
    success: true,
    topicId,
    completed: false,
  };
}
