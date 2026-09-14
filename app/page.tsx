"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Layers,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Search,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SemesterData {
  id: string;
  semesterNumber: number;
  subjectCount: number;
}

interface StructureData {
  university: {
    id: string;
    name: string;
    acronym: string;
  };
  pattern: {
    id: string;
    yearName: string;
  };
  branch: {
    id: string;
    name: string;
  };
  semesters: SemesterData[];
}

export default function HomePage() {
  const [structure, setStructure] = useState<StructureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Syllora — University Syllabus to Structured Learning Path";
  }, []);

  const fetchStructure = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/curriculum/structure");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load curriculum structure.");
      }

      setStructure(json.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to connect to curriculum service.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStructure();
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-border/60">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center">
          {/* Cohort Badge */}
          <div className="inline-flex items-center gap-2 mb-6">
            <Badge
              variant="academic"
              className="px-3.5 py-1 text-xs sm:text-sm font-medium rounded-full flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              SPPU • 2024 Pattern • Computer Engineering
            </Badge>
          </div>

          {/* Title & Tagline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl max-w-3xl mx-auto">
            Syllora
          </h1>

          <p className="mt-4 text-xl sm:text-2xl font-semibold text-foreground/90 max-w-2xl mx-auto">
            Turn your syllabus into a structured learning path.
          </p>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Explore your official university curriculum semester-by-semester and subject-by-subject.
            Every course, unit, and syllabus topic structured for clear, focused study without sign-in barriers.
          </p>

          {/* Quick Search Entry Point */}
          <div className="mt-8 max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-syllora-search"))}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/80 hover:bg-background hover:border-primary/40 px-4 py-3 text-sm text-muted-foreground shadow-xs hover:shadow-sm transition-all text-left group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              aria-label="Search syllabus, topics, and resources"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Search className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
                <span className="truncate">Search subjects, units, topics, or resources...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center rounded border border-border/80 bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Quick jump CTA */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto gap-2 text-base px-7 shadow-sm font-medium">
              <a href="#curriculum">
                <Layers className="h-5 w-5" aria-hidden="true" />
                Explore Semesters
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Curriculum Selection Section */}
      <section id="curriculum" className="py-12 md:py-20 bg-muted/20 scroll-mt-16">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="outline" className="text-xs font-semibold mb-2 uppercase tracking-wider text-primary border-primary/30">
              Curriculum Selection
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {structure ? structure.branch.name : "Computer Engineering"}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              {structure
                ? `${structure.university.acronym} • ${structure.pattern.yearName}`
                : "SPPU • 2024 Pattern"}
            </p>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto" aria-busy="true" aria-label="Loading available semesters">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-6 space-y-4 animate-pulse"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-32 bg-muted rounded" />
                    <div className="h-5 w-20 bg-muted rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
                  </div>
                  <div className="h-9 w-28 bg-muted rounded mt-4" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <Card className="max-w-md mx-auto border-destructive/30 bg-destructive/5 text-center p-6" role="alert">
              <CardContent className="space-y-4 pt-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertCircle className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Unable to Load Curriculum</h3>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
                <Button onClick={fetchStructure} variant="outline" size="sm" className="gap-2">
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Semesters Grid */}
          {!isLoading && !error && structure && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {structure.semesters.map((sem) => (
                <Link
                  key={sem.id}
                  href={`/semester/${sem.semesterNumber}`}
                  className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Card className="h-full border-border/80 transition-all duration-200 hover:border-primary/50 hover:shadow-md group-hover:-translate-y-0.5">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <GraduationCap className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <CardTitle className="text-2xl font-bold">
                            Semester {sem.semesterNumber}
                          </CardTitle>
                        </div>
                        <Badge variant="academic" className="font-semibold text-xs">
                          {sem.subjectCount} {sem.subjectCount === 1 ? "Subject" : "Subjects"}
                        </Badge>
                      </div>
                      <CardDescription className="pt-2 text-sm">
                        {sem.semesterNumber === 3
                          ? "Second Year (SE) • Semester III coursework and foundational theory."
                          : "Second Year (SE) • Semester IV coursework and core computing concepts."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:underline">
                        <span>View Semester Subjects</span>
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust & Academic Value Section */}
      <section className="py-12 md:py-16 border-t border-border/60">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-border bg-card space-y-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-foreground text-base">Official Syllabus Fidelity</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Directly verified against Savitribai Phule Pune University official 2024 Pattern documents.
                Unit titles and syllabus topics are preserved verbatim.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Layers className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-foreground text-base">Structured Hierarchy</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Navigate cleanly from university to pattern, branch, semester, subject, unit, and item.
                Every topic is placed in its proper academic context.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-foreground text-base">Open & Distraction-Free</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                No sign-up forms, no authentication walls, and no paywalls. Straightforward, clean access
                for engineering students and educators.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
