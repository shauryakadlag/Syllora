import { ResourceType } from "@/types/database";

export const ALLOWED_RESOURCE_TYPES: readonly ResourceType[] = [
  "video",
  "article",
  "pdf",
  "playlist",
  "documentation",
] as const;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ValidatedResourceInput {
  title: string;
  url: string;
  type: ResourceType;
  provider: string | null;
  description: string | null;
}

export type ValidationResult =
  | { valid: true; data: ValidatedResourceInput; errors?: never }
  | { valid: false; data?: never; errors: Record<string, string> };

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
 * Validates user input for resource creation or editing.
 * Enforces strict lengths, enum constraints, and URL protocols.
 */
export function validateResourceInput(input: unknown): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      errors: { _general: "Invalid input data received." },
    };
  }

  const raw = input as Record<string, unknown>;

  // 1. Title validation
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    errors.title = "Resource title is required.";
  } else if (title.length < 3) {
    errors.title = "Resource title must be at least 3 characters.";
  } else if (title.length > 200) {
    errors.title = "Resource title cannot exceed 200 characters.";
  }

  // 2. URL validation
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  if (!url) {
    errors.url = "Resource URL is required.";
  } else if (url.length > 2000) {
    errors.url = "Resource URL cannot exceed 2000 characters.";
  } else if (!isSafeUrl(url)) {
    errors.url = "URL must be a valid web address starting with http:// or https://.";
  }

  // 3. Resource Type validation
  const type = typeof raw.type === "string" ? raw.type.trim().toLowerCase() : "";
  if (!type) {
    errors.type = "Resource type is required.";
  } else if (!ALLOWED_RESOURCE_TYPES.includes(type as ResourceType)) {
    errors.type = `Resource type must be one of: ${ALLOWED_RESOURCE_TYPES.join(", ")}.`;
  }

  // 4. Provider validation (optional)
  let provider: string | null = null;
  if (typeof raw.provider === "string") {
    const trimmedProvider = raw.provider.trim();
    if (trimmedProvider.length > 100) {
      errors.provider = "Provider name cannot exceed 100 characters.";
    } else if (trimmedProvider.length > 0) {
      provider = trimmedProvider;
    }
  }

  // 5. Description validation (optional)
  let description: string | null = null;
  if (typeof raw.description === "string") {
    const trimmedDesc = raw.description.trim();
    if (trimmedDesc.length > 1000) {
      errors.description = "Description cannot exceed 1000 characters.";
    } else if (trimmedDesc.length > 0) {
      description = trimmedDesc;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      title,
      url,
      type: type as ResourceType,
      provider,
      description,
    },
  };
}
