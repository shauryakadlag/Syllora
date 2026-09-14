import { getSupabaseServerClient } from "../supabase/server";

// ==============================================================================
// Service Result & Error Types
// ==============================================================================

export interface ServiceError {
  code: "BAD_REQUEST" | "NOT_FOUND" | "DATABASE_ERROR";
  message: string;
}

export type ServiceResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ServiceError };

// ==============================================================================
// Domain Models for Curriculum Read Operations
// ==============================================================================

export interface SemesterInfo {
  id: string;
  semesterNumber: number;
  subjectCount: number;
}

export interface CurriculumStructure {
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
  semesters: SemesterInfo[];
}

export interface SubjectSummary {
  id: string;
  semesterId: string;
  semesterNumber: number;
  courseCode: string;
  subjectName: string;
  unitCount: number;
}

export interface SyllabusItemDetail {
  id: string;
  originalOrder: number;
  officialText: string;
}

export interface UnitDetail {
  id: string;
  unitNumber: string;
  unitOrder: number;
  unitName: string;
  syllabusItems: SyllabusItemDetail[];
}

export interface SubjectDetail {
  id: string;
  semesterId: string;
  semesterNumber: number;
  courseCode: string;
  subjectName: string;
  units: UnitDetail[];
}

// ==============================================================================
// 1. Get Root Curriculum Structure
// ==============================================================================

/**
 * Retrieves the root curriculum metadata for the SPPU 2024 Computer Engineering program,
 * including university, pattern, branch, and available semesters with subject counts.
 */
export async function getCurriculumStructure(): Promise<ServiceResult<CurriculumStructure>> {
  try {
    const supabase = getSupabaseServerClient();

    // Query university, pattern, branch, and semesters in a single joined structure
    const { data: univData, error: univError } = await supabase
      .from("universities")
      .select(`
        id,
        name,
        acronym,
        patterns (
          id,
          year_name,
          branches (
            id,
            name,
            semesters (
              id,
              semester_number,
              subjects (
                id
              )
            )
          )
        )
      `)
      .eq("acronym", "SPPU")
      .maybeSingle();

    if (univError) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to load curriculum structure: ${univError.message}`,
        },
      };
    }

    if (!univData) {
      return {
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Curriculum structure not found for SPPU.",
        },
      };
    }

    const pattern = univData.patterns?.[0];
    const branch = pattern?.branches?.[0];

    if (!pattern || !branch) {
      return {
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Curriculum pattern or branch configuration missing.",
        },
      };
    }

    const sortedSemesters: SemesterInfo[] = (branch.semesters || [])
      .map((sem) => ({
        id: sem.id,
        semesterNumber: sem.semester_number,
        subjectCount: sem.subjects?.length || 0,
      }))
      .sort((a, b) => a.semesterNumber - b.semesterNumber);

    return {
      success: true,
      data: {
        university: {
          id: univData.id,
          name: univData.name,
          acronym: univData.acronym,
        },
        pattern: {
          id: pattern.id,
          yearName: pattern.year_name,
        },
        branch: {
          id: branch.id,
          name: branch.name,
        },
        semesters: sortedSemesters,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected internal error";
    return {
      success: false,
      data: null,
      error: { code: "DATABASE_ERROR", message },
    };
  }
}

// ==============================================================================
// 2. Get Subjects by Semester
// ==============================================================================

/**
 * Retrieves all subjects offered in a specific semester.
 * Validates semesterNumber as an integer within 1-8.
 */
export async function getSubjectsBySemester(
  semesterNumber: number
): Promise<ServiceResult<SubjectSummary[]>> {
  // Input Validation
  if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 8) {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: "Invalid semester number. Must be an integer between 1 and 8.",
      },
    };
  }

  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("subjects")
      .select(`
        id,
        semester_id,
        course_code,
        subject_name,
        semesters!inner (
          id,
          semester_number
        ),
        units (
          id
        )
      `)
      .eq("semesters.semester_number", semesterNumber)
      .order("course_code", { ascending: true });

    if (error) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to load subjects for semester ${semesterNumber}: ${error.message}`,
        },
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
        error: null,
      };
    }

    const summaries: SubjectSummary[] = data.map((row) => ({
      id: row.id,
      semesterId: row.semester_id,
      semesterNumber: (row.semesters as unknown as { semester_number: number }).semester_number,
      courseCode: row.course_code,
      subjectName: row.subject_name,
      unitCount: row.units?.length || 0,
    }));

    return {
      success: true,
      data: summaries,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected internal error";
    return {
      success: false,
      data: null,
      error: { code: "DATABASE_ERROR", message },
    };
  }
}

// ==============================================================================
// 3. Get Subject Detail by Course Code
// ==============================================================================

/**
 * Retrieves the full details of a subject by its course code (e.g., 'PCC-201-COM'),
 * including all units and official syllabus items preserved in original ordering.
 */
export async function getSubjectByCourseCode(
  courseCode: string
): Promise<ServiceResult<SubjectDetail>> {
  // Input Validation
  if (typeof courseCode !== "string") {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: "Course code must be a string.",
      },
    };
  }

  const cleanCode = courseCode.trim();
  if (!cleanCode || cleanCode.length > 30 || !/^[A-Za-z0-9-]+$/.test(cleanCode)) {
    return {
      success: false,
      data: null,
      error: {
        code: "BAD_REQUEST",
        message: "Invalid course code format. Must be an alphanumeric code (e.g., PCC-201-COM).",
      },
    };
  }

  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("subjects")
      .select(`
        id,
        semester_id,
        course_code,
        subject_name,
        semesters!inner (
          id,
          semester_number
        ),
        units (
          id,
          unit_number,
          unit_order,
          unit_name,
          syllabus_items (
            id,
            original_order,
            official_text
          )
        )
      `)
      .ilike("course_code", cleanCode)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: `Failed to load subject ${cleanCode}: ${error.message}`,
        },
      };
    }

    if (!data) {
      return {
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Subject with course code '${cleanCode}' was not found.`,
        },
      };
    }

    // Explicitly sort units by unit_order and syllabus_items by original_order
    const sortedUnits: UnitDetail[] = (data.units || [])
      .map((unit) => ({
        id: unit.id,
        unitNumber: unit.unit_number,
        unitOrder: unit.unit_order,
        unitName: unit.unit_name,
        syllabusItems: (unit.syllabus_items || [])
          .map((item) => ({
            id: item.id,
            originalOrder: item.original_order,
            officialText: item.official_text,
          }))
          .sort((a, b) => a.originalOrder - b.originalOrder),
      }))
      .sort((a, b) => a.unitOrder - b.unitOrder);

    const subjectDetail: SubjectDetail = {
      id: data.id,
      semesterId: data.semester_id,
      semesterNumber: (data.semesters as unknown as { semester_number: number }).semester_number,
      courseCode: data.course_code,
      subjectName: data.subject_name,
      units: sortedUnits,
    };

    return {
      success: true,
      data: subjectDetail,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected internal error";
    return {
      success: false,
      data: null,
      error: { code: "DATABASE_ERROR", message },
    };
  }
}
