"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Pencil,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ResourceStatus } from "@/types/database";

interface ResourceModerationActionsProps {
  resourceId: string;
  status: ResourceStatus;
  resourceTitle: string;
  compact?: boolean;
}

export function ResourceModerationActions({
  resourceId,
  status,
  resourceTitle,
  compact = false,
}: ResourceModerationActionsProps) {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitting = isVerifying || isRejecting;

  async function handleVerify() {
    if (isSubmitting || status !== "pending") return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/resources/${resourceId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || "Failed to verify resource.");
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Network error occurred while verifying resource.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleReject() {
    if (isSubmitting || status !== "pending") return;
    setIsRejecting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/resources/${resourceId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || "Failed to reject resource.");
        return;
      }

      setConfirmingReject(false);
      router.refresh();
    } catch {
      setErrorMessage("Network error occurred while rejecting resource.");
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Action Buttons Row */}
      <div className="flex items-center gap-1.5">
        {status === "pending" && !confirmingReject && (
          <>
            <button
              type="button"
              onClick={handleVerify}
              disabled={isSubmitting}
              title={`Verify "${resourceTitle}"`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              {isVerifying ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              )}
              <span>Verify</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmingReject(true)}
              disabled={isSubmitting}
              title={`Reject "${resourceTitle}"`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <XCircle className="h-3 w-3" aria-hidden="true" />
              <span>Reject</span>
            </button>
          </>
        )}

        {/* Confirmation prompt for rejection */}
        {status === "pending" && confirmingReject && (
          <div className="inline-flex items-center gap-1 bg-background border border-rose-300 dark:border-rose-800 rounded p-1 shadow-xs">
            <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium px-1">
              Confirm rejection?
            </span>
            <button
              type="button"
              onClick={handleReject}
              disabled={isSubmitting}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors disabled:opacity-50"
            >
              {isRejecting ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
              ) : null}
              <span>Yes</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmingReject(false);
                setErrorMessage(null);
              }}
              disabled={isSubmitting}
              className="px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Edit Button is always available */}
        <Link
          href={`/admin/resources/${resourceId}/edit`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium hover:underline py-1 px-2 rounded hover:bg-primary/5 transition-colors border border-transparent hover:border-border"
          title={`Edit metadata for "${resourceTitle}"`}
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
          <span>Edit</span>
        </Link>
      </div>

      {/* Error Message if action failed */}
      {errorMessage && (
        <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 mt-1 max-w-xs text-right">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
