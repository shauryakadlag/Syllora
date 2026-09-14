"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Ban, Loader2, AlertCircle } from "lucide-react";
import { ReportStatus } from "@/types/database";

interface ReportModerationActionsProps {
  reportId: string;
  status: ReportStatus;
  resourceTitle?: string;
}

export function ReportModerationActions({
  reportId,
  status,
  resourceTitle = "resource",
}: ReportModerationActionsProps) {
  const router = useRouter();
  const [isResolving, setIsResolving] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<"resolve" | "dismiss" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitting = isResolving || isDismissing;

  async function handleResolve() {
    if (isSubmitting || status !== "open") return;
    setIsResolving(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/resource-reports/${reportId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || "Failed to resolve report.");
        return;
      }

      setConfirmingAction(null);
      router.refresh();
    } catch {
      setErrorMessage("Network error occurred while resolving report.");
    } finally {
      setIsResolving(false);
    }
  }

  async function handleDismiss() {
    if (isSubmitting || status !== "open") return;
    setIsDismissing(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/resource-reports/${reportId}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || "Failed to dismiss report.");
        return;
      }

      setConfirmingAction(null);
      router.refresh();
    } catch {
      setErrorMessage("Network error occurred while dismissing report.");
    } finally {
      setIsDismissing(false);
    }
  }

  if (status !== "open") {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Action Buttons Row */}
      <div className="flex items-center gap-1.5">
        {!confirmingAction && (
          <>
            <button
              type="button"
              onClick={() => {
                setConfirmingAction("resolve");
                setErrorMessage(null);
              }}
              disabled={isSubmitting}
              title={`Resolve report on "${resourceTitle}"`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Resolve</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmingAction("dismiss");
                setErrorMessage(null);
              }}
              disabled={isSubmitting}
              title={`Dismiss report on "${resourceTitle}"`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/80 border border-border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Dismiss</span>
            </button>
          </>
        )}

        {/* Inline confirmation for Resolve */}
        {confirmingAction === "resolve" && (
          <div className="inline-flex items-center gap-1 bg-background border border-emerald-300 dark:border-emerald-800 rounded-md p-1 shadow-xs">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium px-1">
              Mark as resolved?
            </span>
            <button
              type="button"
              onClick={handleResolve}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors disabled:opacity-50"
            >
              {isResolving && (
                <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
              )}
              <span>Confirm</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmingAction(null);
                setErrorMessage(null);
              }}
              disabled={isSubmitting}
              className="px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Inline confirmation for Dismiss */}
        {confirmingAction === "dismiss" && (
          <div className="inline-flex items-center gap-1 bg-background border border-border rounded-md p-1 shadow-xs">
            <span className="text-[11px] text-muted-foreground font-medium px-1">
              Dismiss this report?
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-white bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 rounded transition-colors disabled:opacity-50"
            >
              {isDismissing && (
                <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
              )}
              <span>Confirm</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmingAction(null);
                setErrorMessage(null);
              }}
              disabled={isSubmitting}
              className="px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 mt-1 max-w-xs text-right">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
