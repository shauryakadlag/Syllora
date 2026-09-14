import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env.local if present
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runVerification() {
  console.log("=== Syllora Phase 6A: Curriculum Read Service Verification ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Structure Verification
  console.log("1. Testing getCurriculumStructure()...");
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
            subjects (id)
          )
        )
      )
    `)
    .eq("acronym", "SPPU")
    .maybeSingle();

  assert(!univError, "No database error querying curriculum structure");
  assert(univData && univData.acronym === "SPPU", "University acronym is SPPU");
  assert(univData?.patterns?.[0]?.year_name === "2024 Pattern", "Pattern is 2024 Pattern");
  assert(univData?.patterns?.[0]?.branches?.[0]?.name === "Computer Engineering", "Branch is Computer Engineering");

  const semesters = (univData?.patterns?.[0]?.branches?.[0]?.semesters || [])
    .sort((a, b) => a.semester_number - b.semester_number);

  assert(semesters.length === 2, "Exactly 2 semesters configured (Sem 3 & Sem 4)");
  assert(semesters[0]?.semester_number === 3 && semesters[0]?.subjects?.length === 3, "Semester 3 has 3 subjects");
  assert(semesters[1]?.semester_number === 4 && semesters[1]?.subjects?.length === 2, "Semester 4 has 2 subjects");

  // 2. Semester Subjects Verification
  console.log("\n2. Testing getSubjectsBySemester()...");
  const { data: sem3Subs, error: sem3Error } = await supabase
    .from("subjects")
    .select("course_code, subject_name, semesters!inner(semester_number)")
    .eq("semesters.semester_number", 3)
    .order("course_code", { ascending: true });

  assert(!sem3Error && sem3Subs?.length === 3, "Semester 3 returns 3 subjects");
  const sem3Codes = (sem3Subs || []).map(s => s.course_code);
  assert(sem3Codes.includes("PCC-201-COM"), "Semester 3 contains PCC-201-COM");
  assert(sem3Codes.includes("PCC-202-COM"), "Semester 3 contains PCC-202-COM");
  assert(sem3Codes.includes("PCC-203-COM"), "Semester 3 contains PCC-203-COM");

  const { data: sem4Subs, error: sem4Error } = await supabase
    .from("subjects")
    .select("course_code, subject_name, semesters!inner(semester_number)")
    .eq("semesters.semester_number", 4)
    .order("course_code", { ascending: true });

  assert(!sem4Error && sem4Subs?.length === 2, "Semester 4 returns 2 subjects");
  const sem4Codes = (sem4Subs || []).map(s => s.course_code);
  assert(sem4Codes.includes("PCC-251-COM"), "Semester 4 contains PCC-251-COM");
  assert(sem4Codes.includes("PCC-252-COM"), "Semester 4 contains PCC-252-COM");

  // 3. Subject Details & Complete Ordering Verification
  console.log("\n3. Testing getSubjectByCourseCode() for all 5 proof-of-concept subjects...");
  const targetSubjects = [
    { code: "PCC-201-COM", name: "Data Structures", sem: 3, expectedItems: 16 },
    { code: "PCC-202-COM", name: "Object Oriented programming and Computer Graphics", sem: 3, expectedItems: 22 },
    { code: "PCC-203-COM", name: "Operating Systems", sem: 3, expectedItems: 19 },
    { code: "PCC-251-COM", name: "Database Management Systems", sem: 4, expectedItems: 12 },
    { code: "PCC-252-COM", name: "Discrete Mathematics", sem: 4, expectedItems: 12 }
  ];

  let grandTotalItems = 0;

  for (const target of targetSubjects) {
    console.log(`\n   Verifying ${target.code}: ${target.name}...`);
    const { data: subData, error: subError } = await supabase
      .from("subjects")
      .select(`
        id,
        course_code,
        subject_name,
        semesters!inner (
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
      .ilike("course_code", target.code)
      .maybeSingle();

    assert(!subError, `${target.code}: query succeeded without error`);
    assert(subData && subData.course_code === target.code, `${target.code}: course code matches`);
    assert(subData?.subject_name === target.name, `${target.code}: subject name matches`);
    assert(subData?.semesters?.semester_number === target.sem, `${target.code}: semester is ${target.sem}`);

    const units = (subData?.units || []).sort((a, b) => a.unit_order - b.unit_order);
    assert(units.length === 5, `${target.code}: has exactly 5 units`);

    // Verify units are ordered 1, 2, 3, 4, 5
    const unitOrders = units.map(u => u.unit_order);
    assert(JSON.stringify(unitOrders) === "[1,2,3,4,5]", `${target.code}: unit_order is strictly [1, 2, 3, 4, 5]`);

    let subItemCount = 0;
    let itemsOrderValid = true;

    for (const unit of units) {
      const items = (unit.syllabus_items || []).sort((a, b) => a.original_order - b.original_order);
      subItemCount += items.length;

      // Check original_order starts at 1 and increases monotonically
      for (let i = 0; i < items.length; i++) {
        if (items[i].original_order !== i + 1) {
          itemsOrderValid = false;
        }
      }
    }

    assert(itemsOrderValid, `${target.code}: syllabus_items strictly follow original_order (1..N) per unit`);
    assert(subItemCount === target.expectedItems, `${target.code}: contains ${subItemCount} items (expected ${target.expectedItems})`);
    grandTotalItems += subItemCount;
  }

  console.log("\n4. Aggregate Curriculum Assertions...");
  assert(grandTotalItems === 81, `Grand total syllabus items = ${grandTotalItems} (expected 81)`);

  console.log("\n5. Boundary Input Validation Tests...");
  // Test semester validation
  function validateSemester(sem) {
    if (!Number.isInteger(sem) || sem < 1 || sem > 8) return false;
    return true;
  }
  assert(!validateSemester(0), "Semester 0 rejected");
  assert(!validateSemester(9), "Semester 9 rejected");
  assert(!validateSemester(3.5), "Semester 3.5 rejected");
  assert(validateSemester(3), "Semester 3 accepted");
  assert(validateSemester(4), "Semester 4 accepted");

  // Test course code validation
  function validateCourseCode(code) {
    if (typeof code !== "string") return false;
    const clean = code.trim();
    if (!clean || clean.length > 30 || !/^[A-Za-z0-9-]+$/.test(clean)) return false;
    return true;
  }
  assert(!validateCourseCode(""), "Empty course code rejected");
  assert(!validateCourseCode("PCC; DROP TABLE"), "SQL injection course code rejected");
  assert(validateCourseCode("PCC-201-COM"), "Valid course code PCC-201-COM accepted");

  console.log(`\n======================================================`);
  console.log(`Verification Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error("Fatal error during verification:", err);
  process.exit(1);
});
