import { NextResponse } from "next/server";
import {
  getCurriculumStructure,
  getSubjectsBySemester,
  getSubjectByCourseCode,
} from "@/lib/services/curriculum";

export const dynamic = "force-dynamic";

/**
 * GET /api/curriculum/structure
 *
 * Returns the complete public curriculum hierarchy:
 * University -> Pattern -> Branch -> Semesters -> Subjects -> Units -> Syllabus Items.
 */
export async function GET() {
  try {
    const structureResult = await getCurriculumStructure();

    if (!structureResult.success) {
      const status = structureResult.error.code === "NOT_FOUND" ? 404 : 500;
      return NextResponse.json(structureResult, { status });
    }

    const { university, pattern, branch, semesters } = structureResult.data;

    // Load full hierarchy down to units and syllabus items
    const populatedSemesters = await Promise.all(
      semesters.map(async (sem) => {
        const subjectsResult = await getSubjectsBySemester(sem.semesterNumber);
        if (!subjectsResult.success) {
          throw new Error(subjectsResult.error.message);
        }

        const subjectsWithDetails = await Promise.all(
          subjectsResult.data.map(async (subj) => {
            const detailResult = await getSubjectByCourseCode(subj.courseCode);
            if (!detailResult.success) {
              throw new Error(detailResult.error.message);
            }
            return detailResult.data;
          })
        );

        return {
          id: sem.id,
          semesterNumber: sem.semesterNumber,
          subjectCount: sem.subjectCount,
          subjects: subjectsWithDetails,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          university,
          pattern,
          branch,
          semesters: populatedSemesters,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
