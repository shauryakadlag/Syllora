"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  Layers,
  ChevronRight,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";

interface SubjectSummary {
  id: string;
  semesterId: string;
  semesterNumber: number;
  courseCode: string;
  subjectName: string;
  unitCount: number;
}

export default function SemesterPage() {
  const params = useParams<{ semester: string }>();
  const semesterParam = params?.semester || "";

  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number>(200);

  const fetchSubjects = useCallback(async () => {
    if (!semesterParam) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/curriculum/semesters/${semesterParam}/subjects`);
      const json = await res.json();
      setStatusCode(res.status);

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load subjects for this semester.");
      }

      setSubjects(json.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [semesterParam]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs
        items={[
          {
            label: `Semester ${semesterParam || "?"}`,
          },
        ]}
      />

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6">
          <div className="space-y-2 animate-pulse">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-6 space-y-4 animate-pulse"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 w-24 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </div>
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="h-8 w-28 bg-muted rounded mt-4" />
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
                    ? "Invalid Semester Requested"
                    : statusCode === 404
                    ? "Semester Not Found"
                    : "Unable to Load Semester"}
                </h2>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-3">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href="/">
                    <ArrowLeft className="h-4 w-4" />
                    Back to All Semesters
                  </Link>
                </Button>
                {statusCode >= 500 && (
                  <Button onClick={fetchSubjects} size="sm" className="gap-1.5">
                    <RotateCw className="h-4 w-4" />
                    Retry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loaded Content */}
      {!isLoading && !error && (
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link
                href="/#curriculum"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Semesters</span>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  Semester {semesterParam}
                </h1>
                <p className="mt-1 text-sm sm:text-base text-muted-foreground">
                  Computer Engineering • SPPU 2024 Pattern
                </p>
              </div>

              <Badge variant="academic" className="w-fit text-xs font-semibold px-3 py-1">
                {subjects.length} {subjects.length === 1 ? "Subject" : "Subjects"} Available
              </Badge>
            </div>
          </div>

          {/* Empty State */}
          {subjects.length === 0 ? (
            <Card className="p-8 text-center bg-muted/20 border-dashed">
              <CardContent className="space-y-3 pt-4">
                <Layers className="h-10 w-10 text-muted-foreground/60 mx-auto" />
                <h3 className="text-base font-semibold text-foreground">No subjects found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Curriculum data for Semester {semesterParam} has not been seeded yet.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href="/">View Available Semesters</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Subjects Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subj) => (
                <Link
                  key={subj.id}
                  href={`/subject/${subj.courseCode}`}
                  className="group block"
                >
                  <Card className="h-full flex flex-col justify-between border-border/80 transition-all duration-200 hover:border-primary/50 hover:shadow-md group-hover:-translate-y-0.5">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="outline" className="font-mono text-[11px] font-semibold tracking-wider text-primary border-primary/30">
                          {subj.courseCode}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px]">
                          {subj.unitCount} {subj.unitCount === 1 ? "Unit" : "Units"}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors leading-snug">
                        {subj.subjectName}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="text-xs text-muted-foreground">
                      <span>Official syllabus units and curriculum items.</span>
                    </CardContent>

                    <CardFooter className="pt-2 border-t border-border/40">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:underline">
                        <span>Explore Units & Topics</span>
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
