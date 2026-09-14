"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  FileText,
  Layers,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";

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

export default function SubjectDetailPage() {
  const params = useParams<{ courseCode: string }>();
  const courseCodeParam = params?.courseCode || "";

  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number>(200);

  const fetchSubject = useCallback(async () => {
    if (!courseCodeParam) return;
    setIsLoading(true);
    setError(null);
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
        <div className="space-y-8">
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
        <div className="max-w-lg mx-auto my-12 text-center">
          <Card className="border-border bg-card p-8 shadow-xs">
            <CardContent className="space-y-4 pt-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" />
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
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
                {statusCode >= 500 && (
                  <Button onClick={fetchSubject} size="sm" className="gap-1.5">
                    <RotateCw className="h-4 w-4" />
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
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
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
                  className="border-border/80 shadow-2xs overflow-hidden transition-shadow hover:shadow-sm"
                >
                  <CardHeader className="bg-muted/30 border-b border-border/60 py-4 px-5 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">
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
                      <ol className="space-y-3.5 list-none">
                        {unit.syllabusItems.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-3 text-sm text-foreground/90 leading-relaxed group"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shrink-0 mt-0.5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              {item.originalOrder}
                            </span>
                            <span className="flex-1 font-normal select-text">
                              {item.officialText}
                            </span>
                          </li>
                        ))}
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
