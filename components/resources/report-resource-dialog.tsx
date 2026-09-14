"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Flag, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportResourceDialogProps {
  resourceId: string;
  resourceTitle: string;
}

const REPORT_REASONS = [
  { value: "broken", label: "Broken or unavailable link", desc: "The link leads to a 404, dead page, or video removed." },
  { value: "misleading", label: "Incorrect or misleading content", desc: "Contains major factual errors or outdated concepts." },
  { value: "irrelevant", label: "Not relevant to this topic", desc: "Content does not match the curriculum topic." },
  { value: "other", label: "Other problem", desc: "Any other quality, formatting, or accessibility issue." },
] as const;

export function ReportResourceDialog({
  resourceId,
  resourceTitle,
}: ReportResourceDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setIsOpen(false);
    setErrorMessage(null);
  }, [isSubmitting]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
    setReason("");
    setDescription("");
    setErrorMessage(null);
    setIsSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/resources/${resourceId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          description: description.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || "Failed to submit report. Please try again.");
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrorMessage("Network error occurred. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 px-1.5 py-0.5 rounded transition-colors focus:outline-hidden focus:ring-1 focus:ring-rose-500/30"
        title="Report an issue with this resource"
        aria-label={`Report issue with ${resourceTitle}`}
      >
        <Flag className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
        <span className="hidden xs:inline">Report</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-0 duration-150"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
          aria-describedby="report-dialog-desc"
        >
          <div
            ref={dialogRef}
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            {isSuccess ? (
              <div className="py-4 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 id="report-dialog-title" className="text-base font-semibold text-foreground">
                  Report Received
                </h3>
                <p id="report-dialog-desc" className="text-xs text-muted-foreground leading-relaxed">
                  Thank you for helping keep Syllora accurate. Your report has been submitted anonymously for administrator review.
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleClose}
                    className="w-full"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-rose-500" aria-hidden="true" />
                    <h3 id="report-dialog-title" className="text-sm sm:text-base font-bold text-foreground">
                      Report Learning Resource
                    </h3>
                  </div>
                  <p id="report-dialog-desc" className="text-xs text-muted-foreground truncate">
                    Resource: <span className="font-medium text-foreground">{resourceTitle}</span>
                  </p>
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs leading-snug"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Reason Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    Why are you reporting this resource? <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-1.5">
                    {REPORT_REASONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          reason === opt.value
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          name="report-reason"
                          value={opt.value}
                          checked={reason === opt.value}
                          onChange={(e) => setReason(e.target.value)}
                          className="mt-0.5 accent-primary h-3.5 w-3.5"
                          disabled={isSubmitting}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground block">
                            {opt.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground/80 block leading-tight">
                            {opt.desc}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Optional Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="report-description" className="font-medium text-foreground">
                      Additional details <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {description.length}/1000
                    </span>
                  </div>
                  <textarea
                    id="report-description"
                    rows={3}
                    maxLength={1000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Provide any additional context to help moderators investigate..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    disabled={!reason || isSubmitting}
                    className="gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    <span>{isSubmitting ? "Submitting..." : "Submit Report"}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
