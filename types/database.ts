/**
 * Supabase Database TypeScript Definitions for Syllora
 * Matches the canonical Phase 4 schema v1.0 (11 tables, 3 enums).
 * No additional tables or speculative fields.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ResourceStatus = "pending" | "verified" | "rejected";
export type ResourceType = "video" | "article" | "pdf" | "playlist" | "documentation";
export type PublishStatus = "draft" | "published";

export interface Database {
  public: {
    Tables: {
      universities: {
        Row: {
          id: string;
          name: string;
          acronym: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          acronym: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          acronym?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      patterns: {
        Row: {
          id: string;
          university_id: string;
          year_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          year_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          university_id?: string;
          year_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patterns_university_id_fkey";
            columns: ["university_id"];
            referencedRelation: "universities";
            referencedColumns: ["id"];
          }
        ];
      };
      branches: {
        Row: {
          id: string;
          pattern_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pattern_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pattern_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branches_pattern_id_fkey";
            columns: ["pattern_id"];
            referencedRelation: "patterns";
            referencedColumns: ["id"];
          }
        ];
      };
      semesters: {
        Row: {
          id: string;
          branch_id: string;
          semester_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          semester_number: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          branch_id?: string;
          semester_number?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "semesters_branch_id_fkey";
            columns: ["branch_id"];
            referencedRelation: "branches";
            referencedColumns: ["id"];
          }
        ];
      };
      subjects: {
        Row: {
          id: string;
          semester_id: string;
          course_code: string;
          subject_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          semester_id: string;
          course_code: string;
          subject_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          semester_id?: string;
          course_code?: string;
          subject_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_semester_id_fkey";
            columns: ["semester_id"];
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          }
        ];
      };
      units: {
        Row: {
          id: string;
          subject_id: string;
          unit_number: string;
          unit_order: number;
          unit_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          unit_number: string;
          unit_order: number;
          unit_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          unit_number?: string;
          unit_order?: number;
          unit_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "units_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      syllabus_items: {
        Row: {
          id: string;
          unit_id: string;
          official_text: string;
          original_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          official_text: string;
          original_order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          unit_id?: string;
          official_text?: string;
          original_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "syllabus_items_unit_id_fkey";
            columns: ["unit_id"];
            referencedRelation: "units";
            referencedColumns: ["id"];
          }
        ];
      };
      admins: {
        Row: {
          id: string;
          role: "admin" | "moderator";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: "admin" | "moderator";
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: "admin" | "moderator";
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      learning_topics: {
        Row: {
          id: string;
          syllabus_item_id: string | null;
          title: string;
          description: string | null;
          status: PublishStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          syllabus_item_id?: string | null;
          title: string;
          description?: string | null;
          status?: PublishStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          syllabus_item_id?: string | null;
          title?: string;
          description?: string | null;
          status?: PublishStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_topics_syllabus_item_id_fkey";
            columns: ["syllabus_item_id"];
            referencedRelation: "syllabus_items";
            referencedColumns: ["id"];
          }
        ];
      };
      resources: {
        Row: {
          id: string;
          title: string;
          url: string;
          type: ResourceType;
          platform: string | null;
          status: ResourceStatus;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          url: string;
          type: ResourceType;
          platform?: string | null;
          status?: ResourceStatus;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          url?: string;
          type?: ResourceType;
          platform?: string | null;
          status?: ResourceStatus;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_verified_by_fkey";
            columns: ["verified_by"];
            referencedRelation: "admins";
            referencedColumns: ["id"];
          }
        ];
      };
      topic_resources: {
        Row: {
          topic_id: string;
          resource_id: string;
          created_at: string;
        };
        Insert: {
          topic_id: string;
          resource_id: string;
          created_at?: string;
        };
        Update: {
          topic_id?: string;
          resource_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topic_resources_topic_id_fkey";
            columns: ["topic_id"];
            referencedRelation: "learning_topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topic_resources_resource_id_fkey";
            columns: ["resource_id"];
            referencedRelation: "resources";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      resource_status: ResourceStatus;
      resource_type: ResourceType;
      publish_status: PublishStatus;
    };
  };
}

// Convenience Row Type Aliases
export type UniversityRow = Database["public"]["Tables"]["universities"]["Row"];
export type PatternRow = Database["public"]["Tables"]["patterns"]["Row"];
export type BranchRow = Database["public"]["Tables"]["branches"]["Row"];
export type SemesterRow = Database["public"]["Tables"]["semesters"]["Row"];
export type SubjectRow = Database["public"]["Tables"]["subjects"]["Row"];
export type UnitRow = Database["public"]["Tables"]["units"]["Row"];
export type SyllabusItemRow = Database["public"]["Tables"]["syllabus_items"]["Row"];
export type AdminRow = Database["public"]["Tables"]["admins"]["Row"];
export type LearningTopicRow = Database["public"]["Tables"]["learning_topics"]["Row"];
export type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];
export type TopicResourceRow = Database["public"]["Tables"]["topic_resources"]["Row"];
