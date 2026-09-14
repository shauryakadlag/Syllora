import { NextRequest, NextResponse } from "next/server";
import { createResourceReport } from "@/lib/services/resource-reports";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    resourceId: string;
  };
}

/**
 * POST /api/resources/[resourceId]/report
 *
 * Allows students/public users to anonymously report a problematic verified learning resource.
 * Invariants:
 * 1. Validates resourceId as UUID format.
 * 2. Target resource must exist and be currently verified.
 * 3. Enforces valid report reason and bounds on optional description.
 * 4. Never modifies resource status, verification fields, or curriculum links.
 * 5. Returns generic safe errors without leaking database internals.
 */
export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  const { resourceId } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Malformed JSON payload in request body.",
        },
      },
      { status: 400 }
    );
  }

  const result = await createResourceReport(resourceId, body);

  if (!result.success) {
    const status =
      result.error.code === "NOT_FOUND"
        ? 404
        : result.error.code === "BAD_REQUEST"
        ? 400
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: result.error.code,
          message: result.error.message,
          ...(result.error.errors ? { errors: result.error.errors } : {}),
        },
      },
      { status }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "Thank you. Your report has been submitted for review.",
      data: {
        id: result.data.id,
      },
    },
    { status: 201 }
  );
}
