"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AdminLinkedTopic,
  AdminPublishedTopicOption,
} from "@/lib/services/admin-resources";

interface ResourceTopicLinksProps {
  resourceId: string;
  initialLinkedTopics: AdminLinkedTopic[];
  availableTopics: AdminPublishedTopicOption[];
}

export function ResourceTopicLinks({
  resourceId,
  initialLinkedTopics,
  availableTopics,
}: ResourceTopicLinksProps) {
  const router = useRouter();
  const [linkedTopics, setLinkedTopics] = useState<AdminLinkedTopic[]>(initialLinkedTopics);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);
  const [unlinkingTopicId, setUnlinkingTopicId] = useState<string | null>(null);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Compute available topics that are not already linked to this resource
  const unlinkedTopics = availableTopics.filter(
    (t) => !linkedTopics.some((lt) => lt.id === t.id)
  );

  async function handleLinkTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTopicId || isLinking) return;

    setIsLinking(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/resources/${resourceId}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: selectedTopicId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || "Failed to link topic.");
        return;
      }

      // Find the topic metadata to append to local state
      const newlyLinked = availableTopics.find((t) => t.id === selectedTopicId);
      if (newlyLinked) {
        setLinkedTopics((prev) => [
          ...prev,
          {
            id: newlyLinked.id,
            normalizedTitle: newlyLinked.normalizedTitle,
            displayOrder: newlyLinked.displayOrder,
            status: "published",
            rankingScore: 0,
            isFeatured: false,
            assignedAt: new Date().toISOString(),
            syllabusItemText: newlyLinked.syllabusItemText,
            unitNumber: newlyLinked.unitNumber,
            unitName: newlyLinked.unitName,
            courseCode: newlyLinked.courseCode,
            subjectName: newlyLinked.subjectName,
          },
        ]);
      }

      setSelectedTopicId("");
      setSuccessMessage(`Topic "${newlyLinked?.normalizedTitle || "Selected"}" linked successfully.`);
      router.refresh();
    } catch {
      setErrorMessage("Network error occurred while linking topic.");
    } finally {
      setIsLinking(false);
    }
  }

  async function handleUnlinkTopic(topicId: string) {
    if (unlinkingTopicId) return;

    setUnlinkingTopicId(topicId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/resources/${resourceId}/topics/${topicId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || "Failed to unlink topic.");
        return;
      }

      const removed = linkedTopics.find((t) => t.id === topicId);
      setLinkedTopics((prev) => prev.filter((t) => t.id !== topicId));
      setConfirmUnlinkId(null);
      setSuccessMessage(`Topic "${removed?.normalizedTitle || ""}" unlinked successfully.`);
      router.refresh();
    } catch {
      setErrorMessage("Network error occurred while unlinking topic.");
    } finally {
      setUnlinkingTopicId(null);
    }
  }

  return (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-foreground">
              <Layers className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Linked Learning Topics
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Associate this resource with official curriculum topics so students can discover it.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono w-fit">
            {linkedTopics.length} {linkedTopics.length === 1 ? "topic" : "topics"} linked
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Status Alerts */}
        {errorMessage && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Currently Linked Topics List */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider">
            Current Topic Associations
          </div>

          {linkedTopics.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 p-8 text-center space-y-2">
              <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">No topics linked</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                This resource is not currently associated with any curriculum topic. Select a published topic below to link it.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden bg-card">
              {linkedTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      {topic.courseCode && (
                        <Badge variant="academic" className="text-[10px] px-1.5 py-0 font-mono">
                          {topic.courseCode}
                        </Badge>
                      )}
                      {topic.subjectName && (
                        <span className="font-medium text-foreground truncate">
                          {topic.subjectName}
                        </span>
                      )}
                      {topic.unitNumber && (
                        <>
                          <span>•</span>
                          <span className="truncate">{topic.unitNumber}</span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground leading-snug">
                      {topic.normalizedTitle}
                    </h4>
                    {topic.syllabusItemText && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                        &ldquo;{topic.syllabusItemText}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {confirmUnlinkId === topic.id ? (
                      <div className="inline-flex items-center gap-1 bg-background border border-rose-300 dark:border-rose-800 rounded p-1 shadow-2xs">
                        <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium px-1">
                          Unlink?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUnlinkTopic(topic.id)}
                          disabled={unlinkingTopicId === topic.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors disabled:opacity-50"
                        >
                          {unlinkingTopicId === topic.id ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
                          ) : null}
                          <span>Yes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmUnlinkId(null)}
                          disabled={unlinkingTopicId === topic.id}
                          className="px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmUnlinkId(topic.id)}
                        disabled={unlinkingTopicId === topic.id}
                        title={`Unlink "${topic.normalizedTitle}"`}
                        className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded border border-rose-200 dark:border-rose-900 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        <span>Unlink</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Link New Topic Form */}
        <div className="border-t border-border/60 pt-5 space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Link Curriculum Topic
            </h3>
          </div>

          {unlinkedTopics.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              All published curriculum topics are already linked to this resource.
            </p>
          ) : (
            <form onSubmit={handleLinkTopic} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1 min-w-0">
                <label htmlFor="topic-select" className="sr-only">
                  Select learning topic to link
                </label>
                <select
                  id="topic-select"
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  disabled={isLinking}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 truncate"
                >
                  <option value="">Select a published curriculum topic to link...</option>
                  {unlinkedTopics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.courseCode ? `[${topic.courseCode}] ` : ""}
                      {topic.subjectName ? `${topic.subjectName} — ` : ""}
                      {topic.unitNumber ? `${topic.unitNumber}: ` : ""}
                      {topic.normalizedTitle}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={!selectedTopicId || isLinking}
                className="inline-flex items-center gap-1.5 shrink-0"
              >
                {isLinking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Link Topic</span>
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
