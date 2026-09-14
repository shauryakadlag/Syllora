import { createClient } from "@supabase/supabase-js";
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_PORT = process.env.TEST_PORT || 3009;
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
      // already terminated
    }
    serverProcess = null;
  }
}

async function isServerReady(url) {
  try {
    const res = await fetch(`${url}/api/curriculum/structure`, { signal: AbortSignal.timeout(1000) });
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

  console.log("=== Syllora Phase 7D: Syllora Search Verification ===\n");

  // ============================================================================
  // 1. Subject Search
  // ============================================================================
  console.log("1. Testing Subject Search (Course Code & Subject Name)...");

  // Search by exact course code
  const codeRes = await fetch(`${BASE_URL}/api/search?q=PCC-201-COM`);
  assert(codeRes.status === 200, "GET /api/search?q=PCC-201-COM returns 200 OK");
  const codeJson = await codeRes.json();
  assert(codeJson.success === true, "Course code search returns success: true");
  const subjectByCode = codeJson.data.find((item) => item.type === "subject" && item.courseCode === "PCC-201-COM");
  assert(!!subjectByCode, "Found subject PCC-201-COM by exact course code");
  assert(subjectByCode?.title === "Data Structures", "Subject title is 'Data Structures'");
  assert(subjectByCode?.subtitle === "Subject · PCC-201-COM", "Subject subtitle format is 'Subject · PCC-201-COM'");
  assert(subjectByCode?.url === "/subject/PCC-201-COM", "Subject navigation URL is '/subject/PCC-201-COM'");

  // Search by partial subject name
  const nameRes = await fetch(`${BASE_URL}/api/search?q=Operating`);
  const nameJson = await nameRes.json();
  const subjectByName = nameJson.data.find((item) => item.type === "subject" && item.courseCode === "PCC-203-COM");
  assert(!!subjectByName, "Found Operating Systems by partial name 'Operating'");
  assert(subjectByName?.url === "/subject/PCC-203-COM", "Operating Systems navigation target is '/subject/PCC-203-COM'");

  // ============================================================================
  // 2. Unit Search
  // ============================================================================
  console.log("\n2. Testing Unit Search (Unit Title & Number)...");

  const unitRes = await fetch(`${BASE_URL}/api/search?q=Hashing`);
  assert(unitRes.status === 200, "GET /api/search?q=Hashing returns 200 OK");
  const unitJson = await unitRes.json();
  const unitItem = unitJson.data.find((item) => item.type === "unit" && item.title.includes("Hashing"));
  assert(!!unitItem, "Found Hashing unit with type 'unit'");
  assert(unitItem?.unitOrder === 4, "Unit order is 4");
  assert(unitItem?.subtitle.includes("Data Structures"), "Unit subtitle contains parent subject name 'Data Structures'");
  assert(unitItem?.url === "/subject/PCC-201-COM#unit-4", "Unit navigation URL points to '/subject/PCC-201-COM#unit-4'");

  // ============================================================================
  // 3. Official Syllabus Item Search
  // ============================================================================
  console.log("\n3. Testing Official Syllabus Item Search...");

  const syllabusRes = await fetch(`${BASE_URL}/api/search?q=Deadlock`);
  assert(syllabusRes.status === 200, "GET /api/search?q=Deadlock returns 200 OK");
  const syllabusJson = await syllabusRes.json();
  const syllabusItem = syllabusJson.data.find(
    (item) => item.type === "syllabus_item" && item.title.toLowerCase().includes("deadlock")
  );
  assert(!!syllabusItem, "Found official syllabus item mentioning 'Deadlock'");
  assert(syllabusItem?.courseCode === "PCC-203-COM", "Syllabus item belongs to Operating Systems (PCC-203-COM)");
  assert(
    syllabusItem?.url === `/subject/PCC-203-COM#item-${syllabusItem?.id}`,
    `Syllabus item navigation URL points to '/subject/PCC-203-COM#item-${syllabusItem?.id}'`
  );
  assert(syllabusItem?.subtitle.includes("Syllabus Item"), "Syllabus item subtitle includes 'Syllabus Item'");

  // ============================================================================
  // 4. Learning Topic Search
  // ============================================================================
  console.log("\n4. Testing Learning Topic Search...");

  const topicRes = await fetch(`${BASE_URL}/api/search?q=Abstract+Data+Types`);
  assert(topicRes.status === 200, "GET /api/search?q=Abstract Data Types returns 200 OK");
  const topicJson = await topicRes.json();
  const topicItem = topicJson.data.find((item) => item.type === "learning_topic");
  assert(!!topicItem, "Found learning topic with type 'learning_topic'");
  assert(
    topicItem?.title === "Introduction to Data Structures and Abstract Data Types",
    "Learning topic title matches canonical topic name"
  );
  assert(topicItem?.subtitle.includes("Learning Topic"), "Topic subtitle includes 'Learning Topic'");
  assert(
    topicItem?.url === `/subject/PCC-201-COM#topic-${topicItem?.id}`,
    `Topic navigation URL points to '/subject/PCC-201-COM#topic-${topicItem?.id}'`
  );

  // ============================================================================
  // 5. Verified Learning Resource Search
  // ============================================================================
  console.log("\n5. Testing Verified Learning Resource Search (Title & Provider)...");

  // By title
  const resTitleRes = await fetch(`${BASE_URL}/api/search?q=Introduction+to+Data+Structures`);
  const resTitleJson = await resTitleRes.json();
  const resourceItem = resTitleJson.data.find((item) => item.type === "resource");
  assert(!!resourceItem, "Found verified resource with type 'resource'");
  assert(resourceItem?.title === "Introduction to Data Structures", "Resource title matches seeded resource");
  assert(resourceItem?.subtitle.includes("GeeksforGeeks"), "Resource subtitle identifies provider 'GeeksforGeeks'");
  assert(resourceItem?.subtitle.includes("Article"), "Resource subtitle identifies resource type 'Article'");
  assert(
    resourceItem?.url === `/subject/PCC-201-COM#resource-${resourceItem?.id}`,
    `Resource navigation target links to anchor '/subject/PCC-201-COM#resource-${resourceItem?.id}'`
  );

  // By provider name
  const providerRes = await fetch(`${BASE_URL}/api/search?q=GeeksforGeeks`);
  const providerJson = await providerRes.json();
  const providerResources = providerJson.data.filter((item) => item.type === "resource");
  assert(providerResources.length >= 2, `Found ${providerResources.length} resources searching by provider 'GeeksforGeeks'`);

  // ============================================================================
  // 6. Case-Insensitive Matching & Whitespace Handling
  // ============================================================================
  console.log("\n6. Testing Case-Insensitive Matching & Whitespace Handling...");

  const lowerRes = await (await fetch(`${BASE_URL}/api/search?q=data+structures`)).json();
  const upperRes = await (await fetch(`${BASE_URL}/api/search?q=DATA+STRUCTURES`)).json();
  const mixedRes = await (await fetch(`${BASE_URL}/api/search?q=DaTa+StRuCtUrEs`)).json();
  const spaceRes = await (await fetch(`${BASE_URL}/api/search?q=%20%20Data%20%20Structures%20%20`)).json();

  assert(
    lowerRes.data.length > 0 && lowerRes.data.length === upperRes.data.length && lowerRes.data.length === mixedRes.data.length,
    "Case-insensitive matching returns identical result count regardless of case"
  );
  assert(
    spaceRes.data.length === lowerRes.data.length,
    "Leading, trailing, and redundant internal whitespace handled seamlessly"
  );

  // ============================================================================
  // 7. Empty Query, Short Query & No-Result States
  // ============================================================================
  console.log("\n7. Testing Empty, Short & No-Result States...");

  const emptyRes = await fetch(`${BASE_URL}/api/search?q=`);
  assert(emptyRes.status === 200, "Empty query (q=) returns 200 OK");
  const emptyJson = await emptyRes.json();
  assert(Array.isArray(emptyJson.data) && emptyJson.data.length === 0, "Empty query returns empty array []");

  const whitespaceRes = await fetch(`${BASE_URL}/api/search?q=%20%20%20`);
  assert(whitespaceRes.status === 200, "Whitespace-only query returns 200 OK");
  const whitespaceJson = await whitespaceRes.json();
  assert(Array.isArray(whitespaceJson.data) && whitespaceJson.data.length === 0, "Whitespace-only query returns empty array []");

  const shortRes = await fetch(`${BASE_URL}/api/search?q=a`);
  assert(shortRes.status === 200, "Single character query returns 200 OK");
  const shortJson = await shortRes.json();
  assert(Array.isArray(shortJson.data) && shortJson.data.length === 0, "Single character query returns empty array [] (min length 2)");

  const noResultRes = await fetch(`${BASE_URL}/api/search?q=nonexistentxyzkeyword123`);
  assert(noResultRes.status === 200, "No-match query returns 200 OK");
  const noResultJson = await noResultRes.json();
  assert(Array.isArray(noResultJson.data) && noResultJson.data.length === 0, "No-match query returns clean empty array []");

  // ============================================================================
  // 8. Query Length Bounds & Special Characters / SQL Injection Safety
  // ============================================================================
  console.log("\n8. Testing Length Bounds & Input Sanitization...");

  const overlongTerm = "a".repeat(101);
  const overlongRes = await fetch(`${BASE_URL}/api/search?q=${overlongTerm}`);
  assert(overlongRes.status === 400, "Query exceeding 100 characters returns 400 Bad Request");
  const overlongJson = await overlongRes.json();
  assert(overlongJson.error?.code === "BAD_REQUEST", "Overlong query error code is BAD_REQUEST");

  // Special characters and SQL injection attempts
  const specialCharsRes = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent("!@#$%^&*()_+-=[]{};':\",./<>?")}`);
  assert(specialCharsRes.status === 200, "Special character string handled safely with 200 OK");

  const sqliRes = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent("' OR '1'='1'; DROP TABLE subjects; --")}`);
  assert(sqliRes.status === 200, "SQL injection attempt safely neutralized with 200 OK");

  // ============================================================================
  // 9. Negative Visibility: Pending/Rejected Resources and Draft Topics
  // ============================================================================
  console.log("\n9. Testing Negative Visibility (Pending/Rejected Resources & Draft Topics)...");

  // "Data Structures Draft Guide" is pending in DB
  const pendingSearch = await (await fetch(`${BASE_URL}/api/search?q=Draft+Guide`)).json();
  const foundPending = pendingSearch.data.some((item) => item.title.includes("Draft Guide"));
  assert(!foundPending, "Pending resource 'Data Structures Draft Guide' is strictly excluded from search");

  // "Low Quality Reference Material" is rejected in DB
  const rejectedSearch = await (await fetch(`${BASE_URL}/api/search?q=Low+Quality`)).json();
  const foundRejected = rejectedSearch.data.some((item) => item.title.includes("Low Quality"));
  assert(!foundRejected, "Rejected resource 'Low Quality Reference Material' is strictly excluded from search");

  // ============================================================================
  // 10. Database Integrity & Syllabus Immutability Check
  // ============================================================================
  console.log("\n10. Verifying Database Integrity & Syllabus Immutability...");

  const { count: syllabusCount } = await supabase
    .from("syllabus_items")
    .select("*", { count: "exact", head: true });
  assert(syllabusCount === 81, `All 81 official syllabus items remain strictly preserved (count: ${syllabusCount})`);

  const { count: subjectCount } = await supabase
    .from("subjects")
    .select("*", { count: "exact", head: true });
  assert(subjectCount === 5, `All 5 official subjects remain strictly preserved (count: ${subjectCount})`);

  // ============================================================================
  // 11. Student UI Component Source-Level Sanity Check
  // ============================================================================
  console.log("\n11. Testing Student UI Wiring (Source Sanity Check)...");

  const headerPath = path.join(process.cwd(), "components", "layout", "header.tsx");
  const headerSource = fs.readFileSync(headerPath, "utf8");
  assert(headerSource.includes("SearchDialog"), "Header component renders SearchDialog");
  assert(headerSource.includes("Search"), "Header component includes search icon and trigger");
  assert(headerSource.includes("open-syllora-search"), "Header listens for global open-syllora-search event");
  assert(headerSource.includes("keydown"), "Header includes keyboard shortcut listener");

  const dialogPath = path.join(process.cwd(), "components", "search", "search-dialog.tsx");
  const dialogSource = fs.readFileSync(dialogPath, "utf8");
  assert(dialogSource.includes('role="dialog"') && dialogSource.includes('aria-modal="true"'), "SearchDialog includes accessible dialog semantics");
  assert(dialogSource.includes('role="listbox"') && dialogSource.includes('role="option"'), "SearchDialog includes listbox/option accessibility roles");
  assert(dialogSource.includes("ArrowDown") && dialogSource.includes("ArrowUp"), "SearchDialog supports arrow key navigation");

  const homePagePath = path.join(process.cwd(), "app", "page.tsx");
  const homePageSource = fs.readFileSync(homePagePath, "utf8");
  assert(homePageSource.includes("open-syllora-search"), "Home page hero includes quick search trigger");

  // ============================================================================
  // 12. Search-Result Anchor Navigation Wiring
  // ============================================================================
  console.log("\n12. Testing Search-Result Anchor Navigation & Offset Wiring...");

  const subjectPagePath = path.join(process.cwd(), "app", "subject", "[courseCode]", "page.tsx");
  const subjectPageSource = fs.readFileSync(subjectPagePath, "utf8");

  assert(
    subjectPageSource.includes("id={`unit-${unit.unitOrder}`}"),
    "Subject page provides stable id={`unit-${unit.unitOrder}`} on Unit cards"
  );
  assert(
    subjectPageSource.includes("id={`item-${item.id}`}"),
    "Subject page provides stable id={`item-${item.id}`} on syllabus item list elements"
  );
  assert(
    subjectPageSource.includes("id={`topic-${topic.id}`}"),
    "Subject page provides stable id={`topic-${topic.id}`} on Learning Topic elements"
  );
  assert(
    subjectPageSource.includes("id={`resource-${resource.id}`}"),
    "Subject page provides stable id={`resource-${resource.id}`} on Learning Resource links"
  );
  assert(
    subjectPageSource.includes("scroll-mt-20"),
    "Subject page elements include scroll-mt-20 to clear sticky header during anchor scroll"
  );
  assert(
    subjectPageSource.includes("scrollToHash") && subjectPageSource.includes("hashchange"),
    "Subject page includes scrollToHash hook listening to hashchange and post-fetch renders"
  );
  assert(
    dialogSource.includes("scrollIntoView"),
    "SearchDialog supports smooth scroll navigation for in-page anchors"
  );

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("\n------------------------------------------------------------");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("------------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  try {
    await startServerIfNeeded();
    await runTests();
  } catch (err) {
    console.error("Verification suite failed:", err);
    process.exit(1);
  } finally {
    killServer();
  }
}

main();
