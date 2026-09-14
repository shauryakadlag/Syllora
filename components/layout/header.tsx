"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, Menu, X, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Syllora
            </span>
          </Link>

          <Badge
            variant="academic"
            className="hidden sm:inline-flex text-[11px] font-medium"
          >
            SPPU 2024 Pattern
          </Badge>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link
            href="/"
            className="transition-colors hover:text-foreground text-foreground"
          >
            Home
          </Link>
          <Link
            href="#flow"
            className="transition-colors hover:text-foreground"
          >
            User Flow
          </Link>
          <Link
            href="#scope"
            className="transition-colors hover:text-foreground"
          >
            Curriculum Scope
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button asChild size="sm" className="gap-2">
            <Link href="#explore">
              <Compass className="h-4 w-4" />
              Explore Syllabus
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 pt-2 pb-6 space-y-3">
          <div className="pt-2 pb-1">
            <Badge variant="academic" className="text-[11px]">
              SPPU 2024 Pattern • SE Comp Eng
            </Badge>
          </div>
          <div className="flex flex-col space-y-2 text-sm font-medium">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 text-foreground transition-colors hover:text-primary"
            >
              Home
            </Link>
            <Link
              href="#flow"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              User Flow
            </Link>
            <Link
              href="#scope"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              Curriculum Scope
            </Link>
          </div>
          <div className="pt-2">
            <Button
              asChild
              className="w-full gap-2 justify-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Link href="#explore">
                <Compass className="h-4 w-4" />
                Explore Syllabus
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
