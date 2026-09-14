"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  RotateCw,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdminResourceSummary } from "@/lib/services/admin-resources";
import {
  ALLOWED_RESOURCE_TYPES,
  isSafeUrl,
} from "@/lib/validation/resources";
import { ResourceType } from "@/types/database";

interface ResourceFormProps {
  mode: "create" | "edit";
  initialData?: AdminResourceSummary;
}

export function ResourceForm({ mode, initialData }: ResourceFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title || "");
  const [url, setUrl] = useState(initialData?.url || "");
  const [type, setType] = useState<ResourceType>(initialData?.type || "article");
  const [provider, setProvider] = useState(initialData?.provider || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Client-side quick validations
    const errors: Record<string, string> = {};
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();

    if (!cleanTitle) {
      errors.title = "Resource title is required.";
    } else if (cleanTitle.length < 3) {
      errors.title = "Title must be at least 3 characters.";
    } else if (cleanTitle.length > 200) {
      errors.title = "Title cannot exceed 200 characters.";
    }

    if (!cleanUrl) {
      errors.url = "Resource URL is required.";
    } else if (cleanUrl.length > 2000) {
      errors.url = "URL cannot exceed 2000 characters.";
    } else if (!isSafeUrl(cleanUrl)) {
      errors.url = "URL must start with http:// or https://.";
    }

    if (!ALLOWED_RESOURCE_TYPES.includes(type)) {
      errors.type = "Please select a valid resource type.";
    }

    if (provider.trim().length > 100) {
      errors.provider = "Provider name cannot exceed 100 characters.";
    }

    if (description.trim().length > 1000) {
      errors.description = "Description cannot exceed 1000 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint =
        mode === "create"
          ? "/api/admin/resources"
          : `/api/admin/resources/${initialData?.id}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const payload = {
        title: cleanTitle,
        url: cleanUrl,
        type,
        provider: provider.trim() || null,
        description: description.trim() || null,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setFieldErrors({
            url: "A resource with this URL already exists in the catalog.",
          });
          return;
        }

        if (res.status === 400 && data.error?.details) {
          setFieldErrors(data.error.details);
          return;
        }

        setFormError(data.error?.message || "Failed to save resource. Please try again.");
        return;
      }

      // Success: refresh and navigate back to resources roster
      router.push("/admin/resources");
      router.refresh();
    } catch {
      setFormError("A network or unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Error Alert */}
      {formError && (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in-0"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold">Operation Failed</p>
            <p className="mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      {/* Verification Notice / State Card */}
      {mode === "edit" && initialData ? (
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5 flex items-start gap-3 text-xs">
          {initialData.status === "verified" && (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Verified Resource</span>
                  <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                    Active in Portal
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Editing metadata preserves this resource&apos;s verified status and audit trail.
                </p>
              </div>
            </>
          )}

          {initialData.status === "pending" && (
            <>
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Pending Resource</span>
                  <Badge variant="secondary" className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                    Awaiting Verification
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  This resource is pending review and is not yet publicly visible to students.
                </p>
              </div>
            </>
          )}

          {initialData.status === "rejected" && (
            <>
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Rejected Resource</span>
                  <Badge variant="secondary" className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20">
                    Excluded
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  This resource has been excluded from the public curriculum catalog.
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-semibold text-foreground">Curatorial Invariant: </span>
            <span>
              All newly registered resources are assigned <strong className="text-foreground">pending</strong> status by default. Verification workflows are strictly preserved.
            </span>
          </div>
        </div>
      )}

      {/* Main Form Fields Card */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Title Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="resource-title"
                className="text-xs font-semibold text-foreground"
              >
                Resource Title <span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {title.length}/200
              </span>
            </div>
            <input
              id="resource-title"
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Asymptotic Notation and Big-O"
              disabled={isSubmitting}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-colors"
            />
            {fieldErrors.title && (
              <p className="text-[11px] font-medium text-destructive mt-1">
                {fieldErrors.title}
              </p>
            )}
          </div>

          {/* URL Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="resource-url"
                className="text-xs font-semibold text-foreground"
              >
                Resource URL <span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                http:// or https:// only
              </span>
            </div>
            <input
              id="resource-url"
              type="url"
              required
              maxLength={2000}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.geeksforgeeks.org/analysis-of-algorithms-set-1-asymptotic-analysis/"
              disabled={isSubmitting}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-colors"
            />
            {fieldErrors.url && (
              <p className="text-[11px] font-medium text-destructive mt-1">
                {fieldErrors.url}
              </p>
            )}
          </div>

          {/* Resource Type & Provider Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-1.5">
              <label
                htmlFor="resource-type"
                className="text-xs font-semibold text-foreground"
              >
                Resource Type <span className="text-destructive">*</span>
              </label>
              <select
                id="resource-type"
                required
                value={type}
                onChange={(e) => setType(e.target.value as ResourceType)}
                disabled={isSubmitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-colors"
              >
                <option value="article">Article</option>
                <option value="video">Video</option>
                <option value="playlist">Playlist</option>
                <option value="pdf">PDF</option>
                <option value="documentation">Documentation</option>
              </select>
              {fieldErrors.type && (
                <p className="text-[11px] font-medium text-destructive mt-1">
                  {fieldErrors.type}
                </p>
              )}
            </div>

            {/* Provider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="resource-provider"
                  className="text-xs font-semibold text-foreground"
                >
                  Provider / Publisher
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Optional
                </span>
              </div>
              <input
                id="resource-provider"
                type="text"
                maxLength={100}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. GeeksforGeeks, NPTEL, MIT OCW"
                disabled={isSubmitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-colors"
              />
              {fieldErrors.provider && (
                <p className="text-[11px] font-medium text-destructive mt-1">
                  {fieldErrors.provider}
                </p>
              )}
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="resource-description"
                className="text-xs font-semibold text-foreground"
              >
                Description / Context
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {description.length}/1000
              </span>
            </div>
            <textarea
              id="resource-description"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the resource content and educational relevance..."
              disabled={isSubmitting}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-colors resize-y"
            />
            {fieldErrors.description && (
              <p className="text-[11px] font-medium text-destructive mt-1">
                {fieldErrors.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          asChild
          disabled={isSubmitting}
        >
          <Link href="/admin/resources" className="inline-flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cancel</span>
          </Link>
        </Button>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[140px]"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <RotateCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span>{mode === "create" ? "Creating..." : "Saving..."}</span>
            </span>
          ) : (
            <span>{mode === "create" ? "Create Resource" : "Save Changes"}</span>
          )}
        </Button>
      </div>
    </form>
  );
}
