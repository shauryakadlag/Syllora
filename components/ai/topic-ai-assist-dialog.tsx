"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  Code,
  HelpCircle,
  X,
  RotateCw,
  AlertCircle,
  LogIn,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type AIAssistMode = "explain" | "example" | "quiz";

interface TopicAIAssistDialogProps {
  topicId: string;
  topicTitle: string;
  courseCode: string;
  isAuthenticated: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function TopicAIAssistDialog({
  topicId,
  topicTitle,
  courseCode,
  isAuthenticated,
  isOpen,
  onClose,
}: TopicAIAssistDialogProps) {
  const [activeMode, setActiveMode] = useState<AIAssistMode>("explain");
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchAssistance = useCallback(
    async (mode: AIAssistMode) => {
      if (!isAuthenticated || !topicId) return;

      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      setActiveMode(mode);

      try {
        const res = await fetch("/api/ai/assist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topicId,
            mode,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.success) {
          setError(
            json?.error?.message ||
              "Failed to load AI learning assistance. Please try again."
          );
          setErrorCode(json?.error?.code || "ERROR");
          setIsLoading(false);
          return;
        }

        setContent(json.data.content);
      } catch {
        setError(
          "A network error occurred while contacting the AI assistance service."
        );
        setErrorCode("NETWORK_ERROR");
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, topicId]
  );

  // Auto-fetch "explain" on initial open if authenticated and content is null
  useEffect(() => {
    if (isOpen && isAuthenticated && !content && !isLoading && !error) {
      fetchAssistance("explain");
    }
  }, [isOpen, isAuthenticated, content, isLoading, error, fetchAssistance]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when topic changes or closes
  useEffect(() => {
    if (!isOpen) {
      setContent(null);
      setError(null);
      setErrorCode(null);
      setActiveMode("explain");
    }
  }, [isOpen, topicId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-0 duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-assist-dialog-title"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Dialog Header */}
        <div className="flex items-start justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <h2
                id="ai-assist-dialog-title"
                className="text-base font-bold text-foreground"
              >
                AI Learning Assistance
              </h2>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Beta
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              Topic: <span className="font-medium text-foreground">{topicTitle}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Unauthenticated State */}
        {!isAuthenticated ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LogIn className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-semibold text-foreground">
                Student Sign In Required
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI Learning Assistance is available for registered students. Sign in to
                your student account to request simple topic explanations, practical examples,
                or practice review quizzes.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
              <Button asChild size="sm" className="gap-1.5">
                <Link
                  href={`/student/login?returnTo=/subject/${courseCode}#topic-${topicId}`}
                  onClick={onClose}
                >
                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign In as Student</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground pt-2">
              All syllabus topics, units, and verified learning resources remain freely
              accessible without signing in.
            </p>
          </div>
        ) : (
          /* Authenticated Mode UI */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Mode Switcher Tabs */}
            <div className="border-b border-border/80 px-6 py-3 bg-muted/10 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => fetchAssistance("explain")}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                    activeMode === "explain"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Explain</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchAssistance("example")}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                    activeMode === "example"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Code className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Example</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchAssistance("quiz")}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                    activeMode === "quiz"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Quiz</span>
                </button>
              </div>

              {content && !isLoading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchAssistance(activeMode)}
                  className="text-xs text-muted-foreground h-7 px-2 gap-1"
                  title="Regenerate response"
                >
                  <RotateCw className="h-3 w-3" aria-hidden="true" />
                  <span>Regenerate</span>
                </Button>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Mandatory Source-of-Truth Disclaimer Banner */}
              <div
                className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300"
                role="note"
                aria-label="AI Disclaimer"
              >
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <p className="leading-relaxed">
                  <strong className="font-semibold">AI-Generated Learning Assistance:</strong> This content is generated to support your studies. The official SPPU syllabus remains the authoritative source of truth.
                </p>
              </div>

              {/* Loading Skeleton State */}
              {isLoading && (
                <div
                  className="py-12 flex flex-col items-center justify-center space-y-3"
                  aria-busy="true"
                  aria-label="Generating AI learning assistance"
                >
                  <RotateCw className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Generating {activeMode} for {topicTitle}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Grounded in SPPU 2024 Pattern curriculum context.
                    </p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {!isLoading && error && (
                <div
                  className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 space-y-3 text-destructive"
                  role="alert"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 text-xs">
                      <p className="font-bold">
                        {errorCode === "AI_NOT_CONFIGURED"
                          ? "AI Service Not Configured"
                          : "AI Assistance Error"}
                      </p>
                      <p className="mt-0.5 text-destructive/90">{error}</p>
                    </div>
                  </div>

                  {errorCode !== "AI_NOT_CONFIGURED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchAssistance(activeMode)}
                      className="text-xs gap-1.5 text-foreground"
                    >
                      <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Try Again</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Loaded AI Content */}
              {!isLoading && !error && content && (
                <div className="rounded-lg border border-border/80 bg-background/50 p-4 sm:p-5">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm font-normal select-text">
                    {content}
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="border-t border-border/80 px-6 py-3 bg-muted/20 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Mode: <span className="capitalize font-medium">{activeMode}</span>
              </span>
              <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
