import React from "react";
import Link from "next/link";
import { BookOpen, GraduationCap } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50 text-muted-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Syllora
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed">
              A learning-resource platform designed to map university syllabus
              topics to useful learning resources topic-by-topic.
            </p>
          </div>

          {/* Scope Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              MVP Target Scope
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="text-foreground/80 font-medium">SPPU (Fixed Context)</li>
              <li>2024 Pattern</li>
              <li>Computer Engineering</li>
              <li>Second Year (SE)</li>
            </ul>
          </div>

          {/* Navigation Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="#flow" className="hover:text-foreground transition-colors">
                  Syllabus Flow
                </Link>
              </li>
              <li>
                <Link href="#scope" className="hover:text-foreground transition-colors">
                  Curriculum Scope
                </Link>
              </li>
              <li>
                <Link href="#explore" className="hover:text-foreground transition-colors">
                  Explore Topics
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Context Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Curriculum Context
            </h4>
            <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <GraduationCap className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>
                Focused on Savitribai Phule Pune University (SPPU) 2024 Pattern Computer Engineering.
              </span>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row text-xs">
          <p>© {new Date().getFullYear()} Syllora. Built for university learners.</p>
          <p className="text-muted-foreground/80">
            Savitribai Phule Pune University • 2024 Pattern • SE Computer Engineering
          </p>
        </div>
      </div>
    </footer>
  );
}