import { ReportReason } from "@/types/database";

export const ALLOWED_REPORT_REASONS: readonly ReportReason[] = [
  "broken",
  "misleading",
  "irrelevant",
  "other",
] as const;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ValidatedReportInput {
  reason: ReportReason;
  description: string | null;
}

export type ReportValidationResult =
  | { valid: true; data: ValidatedReportInput; errors?: never }
  | { valid: false; data?: never; errors: Record<string, string> };

/**
 * Validates user input for student resource reporting.
 * Enforces allowed reasons, optional description up to 1000 chars, and sanitized trimming.
 */
export function validateReportInput(input: unknown): ReportValidationResult {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      errors: { _general: "Invalid input payload received." },
    };
  }

  const raw = input as Record<string, unknown>;

  // 1. Reason validation
  const rawReason = typeof raw.reason === "string" ? raw.reason.trim().toLowerCase() : "";
  if (!rawReason) {
    errors.reason = "Please select a reason for reporting this resource.";
  } else if (!ALLOWED_REPORT_REASONS.includes(rawReason as ReportReason)) {
    errors.reason = `Report reason must be one of: ${ALLOWED_REPORT_REASONS.join(", ")}.`;
  }

  // 2. Description validation (optional)
  let description: string | null = null;
  if (typeof raw.description === "string") {
    const trimmed = raw.description.trim();
    if (trimmed.length > 1000) {
      errors.description = "Description cannot exceed 1000 characters.";
    } else if (trimmed.length > 0) {
      description = trimmed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      reason: rawReason as ReportReason,
      description,
    },
  };
}
