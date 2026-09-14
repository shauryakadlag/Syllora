import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

// 1. Read .env.local if present
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

const TEST_PORT = process.env.TEST_PORT || 3005;
const BASE_URL = process.env.API_BASE_URL || `http://localhost:${TEST_PORT}`;

let serverProcess = null;

function killServer() {
  if (serverProcess && serverProcess.pid) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: "ignore" });
      } else {
        process.kill(-serverProcess.pid, "SIGTERM");
      }
    } catch {
      // Process may already be closed
    }
    serverProcess = null;
  }
}

async function isServerReady(url) {
  try {
    const res = await fetch(`${url}/api/curriculum/semesters/3/subjects`, { signal: AbortSignal.timeout(1000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function startServerIfNeeded() {
  const alreadyRunning = await isServerReady(BASE_URL);
  if (alreadyRunning) {
    console.log(`Using existing server at ${BASE_URL}\n`);
    return;
  }

  console.log(`Starting Next.js production server on port ${TEST_PORT}...`);
  serverProcess = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(TEST_PORT) },
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stderr.on("data", (d) => {
    const errText = d.toString();
    if (errText.includes("Error")) {
      console.error("[Server Error]", errText.trim());
    }
  });

  // Poll until ready
  const startTime = Date.now();
  while (Date.now() - startTime < 20000) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isServerReady(BASE_URL)) {
      console.log(`Next.js server is ready at ${BASE_URL}\n`);
      return;
    }
  }

  throw new Error(`Server failed to start at ${BASE_URL} within 20 seconds.`);
}

async function runTests() {
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

  console.log("=== Syllora Phase 6B: Curriculum API Route Handlers Verification ===\n");

  // ============================================================================
  // 1. Structure Endpoint: GET /api/curriculum/structure
  // ============================================================================
  console.log("1. Testing GET /api/curriculum/structure...");
  const structRes = await fetch(`${BASE_URL}/api/curriculum/structure`);
  assert(structRes.status === 200, "Status is 200 OK");
  assert(
    structRes.headers.get("content-type")?.includes("application/json"),
    "Content-Type header includes application/json"
  );

  const structBody = await structRes.json();
  assert(structBody.success === true, "Response has success: true");
  assert(structBody.data?.university?.acronym === "SPPU", "University acronym is SPPU");
  assert(structBody.data?.pattern?.yearName === "2024 Pattern", "Pattern is 2024 Pattern");
  assert(structBody.data?.branch?.name === "Computer Engineering", "Branch is Computer Engineering");

  const semesters = structBody.data?.semesters || [];
  assert(semesters.length === 2, "Contains exactly 2 semesters");

  let totalSubjects = 0;
  let totalUnits = 0;
  let totalSyllabusItems = 0;

  for (const sem of semesters) {
    const subjects = sem.subjects || [];
    totalSubjects += subjects.length;
    for (const subj of subjects) {
      const units = subj.units || [];
      totalUnits += units.length;
      for (const u of units) {
        totalSyllabusItems += (u.syllabusItems || []).length;
      }
    }
  }

  assert(totalSubjects === 5, `Contains exactly 5 subjects (found: ${totalSubjects})`);
  assert(totalUnits === 25, `Contains exactly 25 units (found: ${totalUnits})`);
  assert(totalSyllabusItems === 81, `Contains exactly 81 syllabus items (found: ${totalSyllabusItems})`);

  // ============================================================================
  // 2. Semesters Endpoint: GET /api/curriculum/semesters/[semester]/subjects
  // ============================================================================
  console.log("\n2. Testing GET /api/curriculum/semesters/[semester]/subjects...");

  // Valid Semester 3
  const sem3Res = await fetch(`${BASE_URL}/api/curriculum/semesters/3/subjects`);
  assert(sem3Res.status === 200, "Semester 3 returns 200 OK");
  const sem3Body = await sem3Res.json();
  assert(sem3Body.success === true, "Semester 3 returns success: true");
  assert(sem3Body.data?.length === 3, "Semester 3 returns exactly 3 subjects");
  const sem3Codes = (sem3Body.data || []).map((s) => s.courseCode);
  assert(
    sem3Codes.includes("PCC-201-COM") &&
      sem3Codes.includes("PCC-202-COM") &&
      sem3Codes.includes("PCC-203-COM"),
    "Semester 3 includes PCC-201-COM, PCC-202-COM, PCC-203-COM"
  );

  // Valid Semester 4
  const sem4Res = await fetch(`${BASE_URL}/api/curriculum/semesters/4/subjects`);
  assert(sem4Res.status === 200, "Semester 4 returns 200 OK");
  const sem4Body = await sem4Res.json();
  assert(sem4Body.success === true, "Semester 4 returns success: true");
  assert(sem4Body.data?.length === 2, "Semester 4 returns exactly 2 subjects");
  const sem4Codes = (sem4Body.data || []).map((s) => s.courseCode);
  assert(
    sem4Codes.includes("PCC-251-COM") && sem4Codes.includes("PCC-252-COM"),
    "Semester 4 includes PCC-251-COM, PCC-252-COM"
  );

  // Invalid Semesters (Expected 400 Bad Request)
  const invalidSemesters = ["0", "9", "3.5", "abc"];
  for (const invalid of invalidSemesters) {
    const invRes = await fetch(`${BASE_URL}/api/curriculum/semesters/${invalid}/subjects`);
    assert(invRes.status === 400, `Semester '${invalid}' returns 400 Bad Request`);
    const invBody = await invRes.json();
    assert(invBody.success === false, `Semester '${invalid}' returns success: false`);
    assert(invBody.error?.code === "BAD_REQUEST", `Semester '${invalid}' error code is BAD_REQUEST`);
  }

  // ============================================================================
  // 3. Subjects Endpoint: GET /api/curriculum/subjects/[courseCode]
  // ============================================================================
  console.log("\n3. Testing GET /api/curriculum/subjects/[courseCode]...");

  const testSubjects = [
    { code: "PCC-201-COM", name: "Data Structures", sem: 3, expectedItems: 16 },
    { code: "PCC-202-COM", name: "Object Oriented programming and Computer Graphics", sem: 3, expectedItems: 22 },
    { code: "PCC-203-COM", name: "Operating Systems", sem: 3, expectedItems: 19 },
    { code: "PCC-251-COM", name: "Database Management Systems", sem: 4, expectedItems: 12 },
    { code: "PCC-252-COM", name: "Discrete Mathematics", sem: 4, expectedItems: 12 },
  ];

  for (const s of testSubjects) {
    const res = await fetch(`${BASE_URL}/api/curriculum/subjects/${s.code}`);
    assert(res.status === 200, `${s.code} returns 200 OK`);
    const body = await res.json();
    assert(body.success === true, `${s.code} returns success: true`);
    assert(body.data?.courseCode === s.code, `${s.code} course code matches`);
    assert(body.data?.subjectName === s.name, `${s.code} subject name matches`);
    assert(body.data?.semesterNumber === s.sem, `${s.code} semester matches ${s.sem}`);

    const units = body.data?.units || [];
    assert(units.length === 5, `${s.code} has exactly 5 units`);

    // Verify unit ordering 1..5
    const unitOrders = units.map((u) => u.unitOrder);
    assert(JSON.stringify(unitOrders) === "[1,2,3,4,5]", `${s.code} unitOrder is strictly [1,2,3,4,5]`);

    // Verify syllabus item ordering and count
    let itemCount = 0;
    let itemsOrdered = true;
    for (const u of units) {
      const items = u.syllabusItems || [];
      itemCount += items.length;
      for (let i = 0; i < items.length; i++) {
        if (items[i].originalOrder !== i + 1) {
          itemsOrdered = false;
        }
      }
    }
    assert(itemsOrdered, `${s.code} syllabusItems strictly follow originalOrder 1..N`);
    assert(itemCount === s.expectedItems, `${s.code} syllabus items count is ${itemCount} (expected ${s.expectedItems})`);
  }

  // Malformed Course Code (Expected 400 Bad Request)
  const malformedCodes = ["invalid*code", "PCC%20DROP", "toolongcodeexceedingmaximumallowedcharacterlimithere"];
  for (const code of malformedCodes) {
    const malRes = await fetch(`${BASE_URL}/api/curriculum/subjects/${code}`);
    assert(malRes.status === 400, `Malformed code '${code}' returns 400 Bad Request`);
    const malBody = await malRes.json();
    assert(malBody.success === false, `Malformed code '${code}' returns success: false`);
    assert(malBody.error?.code === "BAD_REQUEST", `Malformed code '${code}' error code is BAD_REQUEST`);
  }

  // Non-existent Course Code (Expected 404 Not Found)
  const notFoundCodes = ["NONEXISTENT-999", "PCC-999-COM"];
  for (const code of notFoundCodes) {
    const nfRes = await fetch(`${BASE_URL}/api/curriculum/subjects/${code}`);
    assert(nfRes.status === 404, `Non-existent code '${code}' returns 404 Not Found`);
    const nfBody = await nfRes.json();
    assert(nfBody.success === false, `Non-existent code '${code}' returns success: false`);
    assert(nfBody.error?.code === "NOT_FOUND", `Non-existent code '${code}' error code is NOT_FOUND`);
  }

  console.log(`\n======================================================`);
  console.log(`Verification Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  try {
    await startServerIfNeeded();
    await runTests();
  } catch (err) {
    console.error("Fatal test error:", err);
    process.exit(1);
  } finally {
    killServer();
  }
}

main();
