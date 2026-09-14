"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  GraduationCap,
  Layers,
  BookOpen,
  FileText,
  ExternalLink,
  ChevronRight,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchResultItem, SearchResultType } from "@/lib/services/search";

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

function getResultIcon(type: SearchResultType) {
  switch (type) {
    case "subject":
      return <GraduationCap className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />;
    case "unit":
      return <Layers className="h-4 w-4 text-purple-500 shrink-0" aria-hidden="true" />;
    case "learning_topic":
      return <BookOpen className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />;
    case "resource":
      return <ExternalLink className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />;
    case "syllabus_item":
      return <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />;
  }
}

function getBadgeVariant(type: SearchResultType): "default" | "secondary" | "outline" | "academic" {
  switch (type) {
    case "subject":
      return "academic";
    case "learning_topic":
      return "default";
    default:
      return "secondary";
  }
}

function formatBadgeLabel(type: SearchResultType): string {
  switch (type) {
    case "subject":
      return "Subject";
    case "unit":
      return "Unit";
    case "learning_topic":
      return "Learning Topic";
    case "resource":
      return "Resource";
    case "syllabus_item":
      return "Syllabus Item";
  }
}

export function SearchDialog({ isOpen, onClose, initialQuery = "" }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync initial query if dialog opened with query
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      // Auto-focus search input when opened
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialQuery]);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Perform search fetch with debouncing
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setResults(json.data);
          setSelectedIndex(0);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [query]);

  // Handle item navigation
  const handleSelectResult = useCallback(
    (item: SearchResultItem) => {
      onClose();
      router.push(item.url);
      if (typeof window !== "undefined" && item.url.includes("#")) {
        const hash = item.url.substring(item.url.indexOf("#") + 1);
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
    },
    [onClose, router]
  );

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
      // Scroll into view if needed
      scrollSelectedIntoView((selectedIndex + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      scrollSelectedIntoView((selectedIndex - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectResult(results[selectedIndex]);
      }
    }
  };

  const scrollSelectedIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.children;
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search Syllora curriculum"
    >
      <div
        className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3 sm:px-5">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects, units, syllabus items, topics, resources..."
            className="flex-1 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground outline-hidden"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search query"
          />
          {isLoading && (
            <RotateCw className="h-4 w-4 animate-spin text-muted-foreground shrink-0" aria-hidden="true" />
          )}
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded text-xs font-mono text-muted-foreground border border-border hover:bg-muted transition-colors"
            aria-label="Close search"
          >
            ESC
          </button>
        </div>

        {/* Results / Feedback Area */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {/* State 1: Short Query / Guide State */}
          {query.trim().length < 2 && (
            <div className="py-10 px-4 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Search className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Search Syllora Curriculum
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Type at least 2 characters to search across subjects, units, official syllabus items, learning topics, and verified resources.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
                <span className="text-[11px] font-medium">Examples:</span>
                <button
                  type="button"
                  onClick={() => setQuery("Data Structures")}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] hover:bg-muted/80 text-foreground transition-colors"
                >
                  Data Structures
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("Hashing")}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] hover:bg-muted/80 text-foreground transition-colors"
                >
                  Hashing
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("PCC-201-COM")}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] hover:bg-muted/80 text-foreground transition-colors"
                >
                  PCC-201-COM
                </button>
              </div>
            </div>
          )}

          {/* State 2: No Results State */}
          {query.trim().length >= 2 && !isLoading && results.length === 0 && (
            <div className="py-12 px-4 text-center space-y-2">
              <p className="text-sm font-semibold text-foreground">
                No matching content found
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No syllabus content matched &ldquo;{query}&rdquo;. Try searching for a subject name, course code (e.g., PCC-201-COM), or concept keyword.
              </p>
            </div>
          )}

          {/* State 3: Results List */}
          {results.length > 0 && (
            <ul ref={listRef} className="space-y-1" role="listbox" aria-label="Search results">
              {results.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <li
                    key={`${item.type}-${item.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-primary/20 text-foreground"
                        : "hover:bg-muted/60 text-foreground/90"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">{getResultIcon(item.type)}</div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-medium leading-snug line-clamp-1 break-words">
                            {item.title}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={getBadgeVariant(item.type)}
                        className="text-[10px] px-1.5 py-0 font-medium capitalize shrink-0"
                      >
                        {formatBadgeLabel(item.type)}
                      </Badge>
                      <ChevronRight
                        className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                          isSelected ? "translate-x-0.5 text-primary" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer info */}
        {results.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
            <span>
              {results.length} {results.length === 1 ? "result" : "results"} found
            </span>
            <div className="hidden sm:flex items-center gap-2 text-[10px]">
              <span>Navigate: ↑ ↓</span>
              <span>•</span>
              <span>Open: Enter</span>
              <span>•</span>
              <span>Close: Esc</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
