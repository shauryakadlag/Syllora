import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, ShieldCheck, Compass } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ScopeCard() {
  return (
    <section id="scope" className="py-12 md:py-16">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Main Scope Info */}
          <Card className="md:col-span-7 flex flex-col justify-between border-border/90 shadow-2xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="academic" className="text-xs">
                  Fixed MVP Context
                </Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Strictly Scoped
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold">
                Target Curriculum
              </CardTitle>
              <CardDescription>
                Syllora begins with a focused scope to establish a clear, structured
                curriculum mapping before expanding to other years and disciplines.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3.5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Savitribai Phule Pune University (SPPU)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Target university context for this initial release.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    2024 Pattern
                  </div>
                  <div className="text-xs text-muted-foreground">
                    The revised four-year engineering curriculum framework.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Computer Engineering (Second Year — SE)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Initial target focusing on Semester 3 and Semester 4 coursework.
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 text-xs text-muted-foreground border-t border-border/50 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground/80" />
              <span>Other universities, branches, patterns, and years will follow in subsequent versions.</span>
            </CardFooter>
          </Card>

          {/* Action / Launchpad Card */}
          <Card id="explore" className="md:col-span-5 flex flex-col justify-between bg-primary/5 border-primary/20 shadow-2xs">
            <CardHeader>
              <Badge variant="default" className="w-fit text-xs mb-1">
                Navigation Flow
              </Badge>
              <CardTitle className="text-xl font-bold text-foreground">
                Syllabus Navigation
              </CardTitle>
              <CardDescription>
                Explore the structured path from branch to topics.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border/70 bg-background/80 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Context:</span>
                  <span className="font-medium text-foreground">SPPU • 2024 Pattern</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Branch:</span>
                  <span className="font-medium text-foreground">Computer Engineering</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Cohort:</span>
                  <span className="font-medium text-foreground">SE (Semesters 3 & 4)</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Structure:</span>
                  <span className="font-medium text-foreground">Subject → Unit → Topic</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2.5">
              <Button asChild className="w-full gap-2 shadow-sm font-semibold">
                <Link href="#flow">
                  <Compass className="h-4 w-4" />
                  View Syllabus Flow
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Syllabus topics and learning resources will be connected in the next phase.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}