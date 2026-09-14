"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Menu, X, Layers, Search, LogIn, LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchDialog } from "@/components/search/search-dialog";

interface StudentUser {
  id: string;
  email: string;
}

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [student, setStudent] = useState<StudentUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch("/api/student/auth/me");
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted && json.success && json.data?.authenticated) {
          setStudent(json.data.user);
        }
      } catch {
        // Non-blocking
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/student/auth/logout", { method: "POST" });
      setStudent(null);
      window.location.reload();
    } catch {
      // Non-blocking
    }
  }

  // Global hotkeys (Ctrl+K, Cmd+K, or /) and custom event listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA")
      ) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    }

    function onCustomOpen() {
      setIsSearchOpen(true);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-syllora-search", onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-syllora-search", onCustomOpen);
    };
  }, []);

  return (
    <>
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
              SPPU • 2024 Pattern
            </Badge>
          </div>

          {/* Desktop Search Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-52 lg:w-64 justify-between cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            aria-label="Open search dialog"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span>Search curriculum...</span>
            </div>
            <kbd className="inline-flex items-center rounded border border-border/80 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              /
            </kbd>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link
              href="/"
              className="transition-colors hover:text-foreground text-foreground"
            >
              Home
            </Link>
            <Link
              href="/#curriculum"
              className="transition-colors hover:text-foreground"
            >
              Curriculum
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {student ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/80 rounded-md px-2.5 py-1 bg-muted/30">
                  <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span className="max-w-[130px] truncate font-medium text-foreground" title={student.email}>
                    {student.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 gap-1"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </Button>
              </div>
            ) : (
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
                <Link href="/student/login">
                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Student Sign In</span>
                </Link>
              </Button>
            )}

            <Button asChild size="sm" className="gap-2">
              <Link href="/#curriculum">
                <Layers className="h-4 w-4" />
                Explore Semesters
              </Link>
            </Button>
          </div>

          {/* Mobile Actions: Search & Menu Toggle */}
          <div className="flex md:hidden items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open search dialog"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Button>
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
            <div className="pt-2 pb-1 flex items-center justify-between">
              <Badge variant="academic" className="text-[11px]">
                SPPU 2024 Pattern • Computer Engineering
              </Badge>
            </div>

            {/* Mobile Search Button in Menu */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsSearchOpen(true);
              }}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground text-left"
              aria-label="Open search dialog"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span>Search curriculum, topics, resources...</span>
              </div>
            </button>

            <div className="flex flex-col space-y-2 text-sm font-medium">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 text-foreground transition-colors hover:text-primary"
              >
                Home
              </Link>
              <Link
                href="/#curriculum"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                Curriculum
              </Link>
            </div>

            {/* Mobile Student Auth Controls */}
            <div className="pt-1 pb-1 border-t border-border/60">
              {student ? (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span className="truncate font-medium text-foreground">{student.email}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center gap-1.5 text-xs text-muted-foreground"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              ) : (
                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full justify-center gap-1.5 text-xs"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href="/student/login">
                      <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Student Sign In</span>
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="pt-1">
              <Button
                asChild
                className="w-full gap-2 justify-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Link href="/#curriculum">
                  <Layers className="h-4 w-4" />
                  Explore Semesters
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Global Search Dialog */}
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
