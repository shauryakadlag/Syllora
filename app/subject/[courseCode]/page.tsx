"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  RotateCw,
  BookOpen,
  ExternalLink,
  FileText,
  Video,
  ListVideo,
  FileDown,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";

interface LearningResource {
  id: string;
  title: string;
  url: string;
  type: string;
  provider: string;
  description: string | null;
  status: string;
  isFeatured: boolean;
  rankingScore: number;
}

interface LearningTopic {
  id: string;
  syllabusItemId: string;
  normalizedTitle: string;
  displayOrder: number;
  status: string;
}

interface SyllabusItem {
  id: string;
  originalOrder: number;
  officialText: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  unitOrder: number;
  unitName: string;
  syllabusItems: SyllabusItem[];
}

interface SubjectDetail {
  id: string;
  semesterId: string;
  semesterNumber: number;
  courseCode: string;
  subjectName: string;
  units: Unit[];
}

function getResourceTypeIcon(type: string) {
  switch (type) {
    case "video":
      return <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" aria-hidden="true" />;
    case "playlist":
      return <ListVideo className="h-3.5 w-3.5 text-sky-500 shrink-0" aria-hidden="true" />;
    case "article":
      return <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden="true" />;
    case "pdf":
      return <FileDown className="h-3.5 w-3.5 text-rose-500 shrink-0" aria-hidden="true" />;
    case "documentation":
      return <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" aria-hidden="true" />;
    default:
      return <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />;
  }
}

export default function SubjectDetailPage() {
  const params = useParams<{ courseCode: string }>();
  const courseCodeParam = params?.courseCode || "";

  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [topicsByItem, setTopicsByItem] = useState<Record<string, LearningTopic[]>>({});
  const [resourcesByTopic, setResourcesByTopic] = useState<Record<string, LearningResource[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number>(200);

  const fetchSubject = useCallback(async () => {
    if (!courseCodeParam) return;
    setIsLoading(true);
    setError(null);
    setTopicsByItem({});
    setResourcesByTopic({});
    try {
      const res = await fetch(`/api/curriculum/subjects/${courseCodeParam}`);
      const json = await res.json();
      setStatusCode(res.status);

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load subject details.");
      }

      setSubject(json.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [courseCodeParam]);

  useEffect(() => {
    fetchSubject();
  }, [fetchSubject]);

  useEffect(() => {
    if (!subject) return;

    const items = subject.units.flatMap((u) => u.syllabusItems || []);
    if (items.length === 0) return;

    let isMounted = true;

    async function loadTopics() {
      try {
        const topicPromises = items.map(async (item) => {
          try {
            const res = await fetch(`/api/curriculum/syllabus-items/${item.id}/topics`);
            if (!res.ok) return { itemId: item.id, topics: [] };
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              return { itemId: item.id, topics: json.data as LearningTopic[] };
            }
            return { itemId: item.id, topics: [] };
          } catch {
            return { itemId: item.id, topics: [] };
          }
        });

        const results = await Promise.allSettled(topicPromises);
        if (!isMounted) return;

        const mapping: Record<string, LearningTopic[]> = {};
        for (const res of results) {
          if (res.status === "fulfilled" && res.value.topics.length > 0) {
            mapping[res.value.itemId] = res.value.topics;
          }
        }
        setTopicsByItem(mapping);

        const allTopics = Object.values(mapping).flat();
        if (allTopics.length > 0) {
          const resourcePromises = allTopics.map(async (topic) => {
            try {
              const res = await fetch(`/api/curriculum/topics/${topic.id}/resources`);
              if (!res.ok) return { topicId: topic.id, resources: [] };
              const json = await res.json();
              if (json.success && Array.isArray(json.data)) {
                return { topicId: topic.id, resources: json.data as LearningResource[] };
              }
              return { topicId: topic.id, resources: [] };
            } catch {
              return { topicId: topic.id, resources: [] };
            }
          });

          const resResults = await Promise.allSettled(resourcePromises);
          if (!isMounted) return;

          const resMapping: Record<string, LearningResource[]> = {};
          for (const r of resResults) {
            if (r.status === "fulfilled" && r.value.resources.length > 0) {
              resMapping[r.value.topicId] = r.value.resources;
            }
          }
          setResourcesByTopic(resMapping);
        }
      } catch {
        // Gracefully preserve official syllabus even if topics network fails
      }
    }

    loadTopics();

    return () => {
      isMounted = false;
    };
  }, [subject]);

  useEffect(() => {
    if (subject) {
      document.title = `${subject.subjectName} (${subject.courseCode}) | Syllora`;
    }
  }, [subject]);

  useEffect(() => {
    function scrollToHash() {
      if (typeof window === "undefined") return;
      const hash = window.location.hash;
      if (!hash) return;
      const targetId = hash.replace("#", "");
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }

    if (subject) {
      const timer = setTimeout(scrollToHash, 150);
      window.addEventListener("hashchange", scrollToHash);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("hashchange", scrollToHash);
      };
    }
  }, [subject, topicsByItem, resourcesByTopic]);

  const totalSyllabusItems =
    subject?.units.reduce((acc, u) => acc + (u.syllabusItems?.length || 0), 0) || 0;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          {
            label: subject ? `Semester ${subject.semesterNumber}` : "Semester",
            href: subject ? `/semester/${subject.semesterNumber}` : "/#curriculum",
          },
          {
            label: subject ? subject.subjectName : courseCodeParam || "Subject",
          },
        ]}
      />

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-8" aria-busy="true" aria-label="Loading subject details">
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-36 bg-muted rounded" />
            <div className="flex gap-2">
              <div className="h-6 w-28 bg-muted rounded-full" />
              <div className="h-6 w-24 bg-muted rounded-full" />
            </div>
            <div className="h-10 w-3/4 bg-muted rounded mt-2" />
            <div className="h-5 w-60 bg-muted rounded" />
          </div>

          <div className="space-y-6 pt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-6 space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-6 w-48 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-5/6 bg-muted rounded" />
                  <div className="h-4 w-4/6 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="max-w-lg mx-auto my-12 text-center" role="alert">
          <Card className="border-border bg-card p-8 shadow-xs">
            <CardContent className="space-y-4 pt-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">
                  {statusCode === 400
                    ? "Invalid Course Code"
                    : statusCode === 404
                    ? "Subject Not Found"
                    : "Unable to Load Subject"}
                </h2>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-3">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href="/">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to Home
                  </Link>
                </Button>
                {statusCode >= 500 && (
                  <Button onClick={fetchSubject} size="sm" className="gap-1.5">
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    Retry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loaded Subject Detail */}
      {!isLoading && !error && subject && (
        <div className="space-y-10">
          {/* Header */}
          <div className="space-y-4 border-b border-border/80 pb-8">
            <div className="flex items-center gap-2">
              <Link
                href={`/semester/${subject.semesterNumber}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-1 -ml-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back to Semester {subject.semesterNumber}</span>
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="academic" className="font-mono text-xs font-bold px-2.5 py-0.5">
                  {subject.courseCode}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Semester {subject.semesterNumber}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {subject.units.length} Units
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {totalSyllabusItems} Official Topics
                </Badge>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {subject.subjectName}
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground">
                Computer Engineering • Savitribai Phule Pune University • 2024 Pattern
              </p>
            </div>
          </div>

          {/* Units and Syllabus Content */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Curriculum Units & Syllabus Content
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Preserved verbatim from the official SPPU 2024 Pattern syllabus.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-[11px] text-muted-foreground">
                Official Verbatim Content
              </Badge>
            </div>

            {/* Units List */}
            <div className="space-y-6">
              {subject.units.map((unit) => (
                <Card
                  key={unit.id}
                  id={`unit-${unit.unitOrder}`}
                  className="scroll-mt-20 border-border/80 shadow-2xs overflow-hidden transition-shadow hover:shadow-sm"
                >
                  <CardHeader className="bg-muted/30 border-b border-border/60 py-4 px-5 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0" aria-hidden="true">
                          {unit.unitOrder}
                        </span>
                        <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                          Unit {unit.unitOrder} — {unit.unitName}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="w-fit text-[11px] font-medium shrink-0">
                        {unit.syllabusItems?.length || 0}{" "}
                        {(unit.syllabusItems?.length || 0) === 1 ? "Item" : "Items"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 sm:p-6">
                    {unit.syllabusItems && unit.syllabusItems.length > 0 ? (
                      <ol className="space-y-4 list-none">
                        {unit.syllabusItems.map((item) => {
                          const itemTopics = topicsByItem[item.id] || [];
                          return (
                            <li
                              key={item.id}
                              id={`item-${item.id}`}
                              className="scroll-mt-20 flex items-start gap-3 text-sm text-foreground/90 leading-relaxed group"
                            >
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0 mt-0.5 group-hover:bg-primary/10 group-hover:text-primary transition-colors select-none"
                                aria-hidden="true"
                              >
                                {item.originalOrder}
                              </span>
                              <div className="flex-1 min-w-0 space-y-2">
                                <p className="font-normal select-text break-words text-foreground/90">
                                  {item.officialText}
                                </p>

                                {/* Learning Topics (if published for this item) */}
                                {itemTopics.length > 0 && (
                                  <div
                                    className="space-y-1.5 pt-0.5"
                                    aria-label={`Learning topics for syllabus item ${item.originalOrder}`}
                                  >
                                    {itemTopics.map((topic) => {
                                      const topicResources = resourcesByTopic[topic.id] || [];
                                      return (
                                        <div
                                          key={topic.id}
                                          id={`topic-${topic.id}`}
                                          className="scroll-mt-20 space-y-2 rounded-lg border border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.07] p-2.5 sm:p-3 text-xs transition-colors hover:border-primary/30"
                                        >
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <BookOpen
                                                className="h-3.5 w-3.5 text-primary"
                                                aria-hidden="true"
                                              />
                                              <span className="text-[10px] font-bold tracking-wider uppercase text-primary font-mono">
                                                Learning Topic
                                              </span>
                                            </div>
                                            <span
                                              className="text-muted-foreground/60 hidden sm:inline select-none"
                                              aria-hidden="true"
                                            >
                                              •
                                            </span>
                                            <span className="font-medium text-foreground leading-snug break-words">
                                              {topic.normalizedTitle}
                                            </span>
                                          </div>

                                          {/* Curated Resources (if verified resources exist for this topic) */}
                                          {topicResources.length > 0 && (
                                            <div
                                              className="pt-2 border-t border-primary/10 space-y-1.5"
                                              aria-label={`Learning resources for ${topic.normalizedTitle}`}
                                            >
                                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                                <span>Curated Learning Resources</span>
                                                <span className="text-muted-foreground/40">•</span>
                                                <span className="text-[10px] font-normal text-muted-foreground">
                                                  {topicResources.length}{" "}
                                                  {topicResources.length === 1 ? "resource" : "resources"}
                                                </span>
                                              </div>
                                              <div className="grid grid-cols-1 gap-1.5">
                                                {topicResources.map((resource) => (
                                                  <a
                                                    key={resource.id}
                                                    id={`resource-${resource.id}`}
                                                    href={resource.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="scroll-mt-20 group/res flex items-center justify-between gap-2.5 rounded-md border border-border/70 bg-background/80 hover:bg-muted/40 hover:border-border px-2.5 py-2 text-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                                    aria-label={`${resource.title} on ${resource.provider} (opens in a new tab)`}
                                                  >
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                      {getResourceTypeIcon(resource.type)}
                                                      <span className="font-medium text-foreground group-hover/res:text-primary transition-colors truncate">
                                                        {resource.title}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                      {resource.isFeatured && (
                                                        <Badge
                                                          variant="outline"
                                                          className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-medium gap-0.5"
                                                        >
                                                          <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                                                          Featured
                                                        </Badge>
                                                      )}
                                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                                                        {resource.type}
                                                      </Badge>
                                                      <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                                                        {resource.provider}
                                                      </span>
                                                      <ExternalLink
                                                        className="h-3 w-3 text-muted-foreground group-hover/res:text-foreground transition-colors"
                                                        aria-hidden="true"
                                                      />
                                                    </div>
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No syllabus items listed for this unit.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
