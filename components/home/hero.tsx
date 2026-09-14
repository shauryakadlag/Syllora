import React from "react";
import Link from "next/link";
import { ArrowRight, BookMarked, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center">
        {/* Academic focus badge - Fixed MVP context */}
        <div className="inline-flex items-center gap-2 mb-6">
          <Badge
            variant="academic"
            className="px-3.5 py-1 text-xs sm:text-sm font-medium rounded-full flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            SPPU 2024 Pattern • Computer Engineering
          </Badge>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl max-w-3xl mx-auto">
          Syllora
        </h1>

        {/* Tagline */}
        <p className="mt-4 text-xl sm:text-2xl font-medium text-foreground/90 max-w-2xl mx-auto">
          Connecting university syllabus topics with useful learning resources.
        </p>

        {/* Subtitle / Product Goal */}
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Navigate your engineering curriculum topic-by-topic. Syllora is designed to map
          course units and topics directly to helpful learning resources, focused initially on
          Second Year (SE) Computer Engineering under the SPPU 2024 Pattern.
        </p>

        {/* Primary CTA and Secondary actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto gap-2 text-base px-7 shadow-sm">
            <Link href="#explore">
              <BookMarked className="h-5 w-5" />
              Explore Syllabus
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base px-6">
            <Link href="#flow">
              View Syllabus Flow
            </Link>
          </Button>
        </div>

        {/* Quick meta indicators - Fixed MVP Context */}
        <div className="mt-12 pt-8 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">University</div>
            <div className="mt-1 text-sm font-semibold text-foreground">SPPU (Fixed Context)</div>
          </div>
          <div className="p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pattern</div>
            <div className="mt-1 text-sm font-semibold text-foreground">2024 Pattern</div>
          </div>
          <div className="p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Branch</div>
            <div className="mt-1 text-sm font-semibold text-foreground">Computer Eng</div>
          </div>
          <div className="p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Target Cohort</div>
            <div className="mt-1 text-sm font-semibold text-foreground">Second Year (SE)</div>
          </div>
        </div>
      </div>
    </section>
  );
}