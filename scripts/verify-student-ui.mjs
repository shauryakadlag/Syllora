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

const TEST_PORT = process.env.TEST_PORT || 3006;
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
      // already stopped
    }
    serverProcess = null;
  }
}

async function isServerReady(url) {
  try {
    const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(1000) });
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

  console.log("=== Syllora Phase 6C: Student Curriculum UI Verification ===\n");

  // ============================================================================
  // 1. Home Page Verification
  // ============================================================================
  console.log("1. Testing Home Page (/) Route & Content...");
  const homeRes = await fetch(`${BASE_URL}/`);
  assert(homeRes.status === 200, "Home page (/) returns HTTP 200 OK");
  const homeHtml = await homeRes.text();
  assert(homeHtml.includes("Syllora"), "Home page HTML contains brand 'Syllora'");
  assert(
    homeHtml.includes("Turn your syllabus into a structured learning path") ||
      homeHtml.includes("learning path"),
    "Home page HTML contains hero tagline"
  );
  assert(
    homeHtml.includes("SPPU") && homeHtml.includes("2024 Pattern"),
    "Home page HTML contains SPPU 2024 Pattern context"
  );

  // Verify structure endpoint backing the home page
  const structRes = await fetch(`${BASE_URL}/api/curriculum/structure`);
  const structJson = await structRes.json();
  assert(structJson.success === true, "Home page backing API returns success: true");
  const semNumbers = (structJson.data?.semesters || []).map((s) => s.semesterNumber);
  assert(
    semNumbers.includes(3) && semNumbers.includes(4),
    "Backing API provides Semester 3 and Semester 4"
  );

  // ============================================================================
  // 2. Semester Pages Verification
  // ============================================================================
  console.log("\n2. Testing Semester Pages (/semester/[semester])...");

  // Semester 3
  const sem3Res = await fetch(`${BASE_URL}/semester/3`);
  assert(sem3Res.status === 200, "GET /semester/3 returns HTTP 200 OK");
  const sem3Html = await sem3Res.text();
  assert(sem3Html.includes("Semester"), "Semester 3 page renders semester shell");

  const sem3ApiRes = await fetch(`${BASE_URL}/api/curriculum/semesters/3/subjects`);
  const sem3ApiJson = await sem3ApiRes.json();
  assert(sem3ApiJson.data?.length === 3, "Semester 3 backing API provides exactly 3 subjects");
  const sem3Names = (sem3ApiJson.data || []).map((s) => s.subjectName);
  assert(sem3Names.includes("Data Structures"), "Semester 3 contains Data Structures");
  assert(
    sem3Names.includes("Object Oriented programming and Computer Graphics"),
    "Semester 3 contains Object Oriented programming and Computer Graphics"
  );
  assert(sem3Names.includes("Operating Systems"), "Semester 3 contains Operating Systems");

  // Semester 4
  const sem4Res = await fetch(`${BASE_URL}/semester/4`);
  assert(sem4Res.status === 200, "GET /semester/4 returns HTTP 200 OK");
  const sem4ApiRes = await fetch(`${BASE_URL}/api/curriculum/semesters/4/subjects`);
  const sem4ApiJson = await sem4ApiRes.json();
  assert(sem4ApiJson.data?.length === 2, "Semester 4 backing API provides exactly 2 subjects");
  const sem4Names = (sem4ApiJson.data || []).map((s) => s.subjectName);
  assert(sem4Names.includes("Database Management Systems"), "Semester 4 contains Database Management Systems");
  assert(sem4Names.includes("Discrete Mathematics"), "Semester 4 contains Discrete Mathematics");

  // ============================================================================
  // 3. Subject Detail Pages Verification
  // ============================================================================
  console.log("\n3. Testing Subject Detail Pages (/subject/[courseCode])...");

  const testSubjects = [
    { code: "PCC-201-COM", name: "Data Structures", sem: 3, expectedItems: 16 },
    { code: "PCC-202-COM", name: "Object Oriented programming and Computer Graphics", sem: 3, expectedItems: 22 },
    { code: "PCC-203-COM", name: "Operating Systems", sem: 3, expectedItems: 19 },
    { code: "PCC-251-COM", name: "Database Management Systems", sem: 4, expectedItems: 12 },
    { code: "PCC-252-COM", name: "Discrete Mathematics", sem: 4, expectedItems: 12 },
  ];

  for (const s of testSubjects) {
    const pageRes = await fetch(`${BASE_URL}/subject/${s.code}`);
    assert(pageRes.status === 200, `GET /subject/${s.code} returns HTTP 200 OK`);

    const apiRes = await fetch(`${BASE_URL}/api/curriculum/subjects/${s.code}`);
    assert(apiRes.status === 200, `API /api/curriculum/subjects/${s.code} returns 200 OK`);
    const apiJson = await apiRes.json();
    assert(apiJson.success === true, `${s.code} API response has success: true`);
    assert(apiJson.data?.courseCode === s.code, `${s.code} course code matches`);
    assert(apiJson.data?.subjectName === s.name, `${s.code} subject name matches`);
    assert(apiJson.data?.units?.length === 5, `${s.code} has exactly 5 units`);

    // Verify ordering 1..5
    const unitOrders = (apiJson.data?.units || []).map((u) => u.unitOrder);
    assert(
      JSON.stringify(unitOrders) === "[1,2,3,4,5]",
      `${s.code} unitOrder is strictly [1,2,3,4,5]`
    );

    // Verify syllabus item count and monotonic ordering
    let totalItems = 0;
    let itemsOrdered = true;
    for (const u of apiJson.data?.units || []) {
      const items = u.syllabusItems || [];
      totalItems += items.length;
      for (let i = 0; i < items.length; i++) {
        if (items[i].originalOrder !== i + 1) {
          itemsOrdered = false;
        }
      }
    }
    assert(itemsOrdered, `${s.code} syllabus items follow originalOrder (1..N) per unit`);
    assert(
      totalItems === s.expectedItems,
      `${s.code} contains ${totalItems} syllabus items (expected: ${s.expectedItems})`
    );
  }

  // ============================================================================
  // 4. Error Cases Verification
  // ============================================================================
  console.log("\n4. Testing Error Cases & Boundary Conditions...");

  // Non-existent semester page loads shell, API rejects with 400
  const badSemRes = await fetch(`${BASE_URL}/semester/9`);
  assert(badSemRes.status === 200, "GET /semester/9 serves client shell with 200 OK");
  const badSemApiRes = await fetch(`${BASE_URL}/api/curriculum/semesters/9/subjects`);
  assert(badSemApiRes.status === 400, "API /api/curriculum/semesters/9/subjects returns 400 Bad Request");
  const badSemApiJson = await badSemApiRes.json();
  assert(badSemApiJson.error?.code === "BAD_REQUEST", "API returns BAD_REQUEST code for invalid semester");

  // Non-existent subject code page loads shell, API rejects with 404
  const nfSubRes = await fetch(`${BASE_URL}/subject/NONEXISTENT-999`);
  assert(nfSubRes.status === 200, "GET /subject/NONEXISTENT-999 serves client shell with 200 OK");
  const nfSubApiRes = await fetch(`${BASE_URL}/api/curriculum/subjects/NONEXISTENT-999`);
  assert(nfSubApiRes.status === 404, "API /api/curriculum/subjects/NONEXISTENT-999 returns 404 Not Found");
  const nfSubApiJson = await nfSubApiRes.json();
  assert(nfSubApiJson.error?.code === "NOT_FOUND", "API returns NOT_FOUND code for nonexistent subject");

  // Malformed course code
  const malSubApiRes = await fetch(`${BASE_URL}/api/curriculum/subjects/bad*code!`);
  assert(malSubApiRes.status === 400, "API /api/curriculum/subjects/bad*code! returns 400 Bad Request");

  console.log(`\n======================================================`);
  console.log(`UI Verification Complete: ${passed} PASSED, ${failed} FAILED`);
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
    console.error("Fatal UI test error:", err);
    process.exit(1);
  } finally {
    killServer();
  }
}

main();
