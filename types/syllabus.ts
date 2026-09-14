/**
 * Minimal Domain Models for Syllora
 * Represents the syllabus hierarchy:
 * Computer Engineering → Semester → Subject → Unit → Topic → Learning Resources
 *
 * Fixed MVP Context: SPPU (Savitribai Phule Pune University) • 2024 Pattern
 * No premature ranking or database schema assumptions.
 */

export interface Branch {
  id: string;
  code: string; // e.g. "COMP"
  name: string; // e.g. "Computer Engineering"
}

export interface Semester {
  id: string;
  number: number; // 3 or 4
  title: string; // e.g. "Semester III"
}

export interface Subject {
  id: string;
  semesterId: string;
  code: string; // e.g. "210241"
  name: string;
  shortName?: string;
}

export interface Unit {
  id: string;
  subjectId: string;
  unitNumber: number; // 1 to 6
  title: string;
}

export interface Topic {
  id: string;
  unitId: string;
  title: string;
  orderIndex: number;
}

export type ResourceType =
  | "video"
  | "notes"
  | "textbook"
  | "article"
  | "documentation";

export interface LearningResource {
  id: string;
  topicId: string;
  title: string;
  url: string;
  resourceType: ResourceType;
  platform?: string; // e.g. "YouTube", "NPTEL", "GeeksforGeeks"
}

/**
 * Minimal navigation context tracking user location in the syllabus hierarchy
 */
export interface SyllabusNavigationContext {
  branchId?: string;
  semesterId?: string;
  subjectId?: string;
  unitId?: string;
  topicId?: string;
}