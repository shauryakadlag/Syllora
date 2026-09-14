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

const TEST_PORT = process.env.TEST_PORT || 3007;
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

  console.log("=== Syllora Phase 7A: Learning Topic Foundation Verification ===\n");

  // ============================================================================
  // 1. Database & Data Integrity
  // ============================================================================
  console.log("1. Testing Database & Learning Topics Integrity...");

  // Query all learning topics with syllabus item and course context
  const { data: topics, error: topicsError } = await supabase
    .from("learning_topics")
    .select(`
      id,
      syllabus_item_id,
      normalized_title,
      display_order,
      status,
      created_at,
      syllabus_items!inner (
        id,
        official_text,
        original_order,
        units!inner (
          unit_order,
          unit_name,
          subjects!inner (
            course_code,
            subject_name
          )
        )
      )
    `)
    .order("created_at", { ascending: true });

  assert(!topicsError, `No error querying learning_topics table: ${topicsError?.message || "OK"}`);
  assert(topics && topics.length === 7, `Exactly 7 learning topics seeded (found: ${topics?.length || 0})`);

  // Verify all topics are published
  const allPublished = (topics || []).every((t) => t.status === "published");
  assert(allPublished, "All seeded topics have status 'published' (accessible under RLS)");

  // Verify no orphans (every topic has an existing syllabus item)
  const allHaveValidParents = (topics || []).every((t) => !!t.syllabus_items?.id);
  assert(allHaveValidParents, "All topics trace back to a valid syllabus item (0 orphans)");

  // Verify subject breakdown:
  // Data Structures: 2
  // OOP & CG: 1
  // Operating Systems: 1
  // DBMS: 2
  // Discrete Mathematics: 1
  const subjectDistribution = {};
  for (const t of topics || []) {
    const code = t.syllabus_items.units.subjects.course_code;
    subjectDistribution[code] = (subjectDistribution[code] || 0) + 1;
  }

  assert(subjectDistribution["PCC-201-COM"] === 2, "Data Structures (PCC-201-COM) has 2 seeded topics");
  assert(subjectDistribution["PCC-202-COM"] === 1, "OOP & CG (PCC-202-COM) has 1 seeded topic");
  assert(subjectDistribution["PCC-203-COM"] === 1, "Operating Systems (PCC-203-COM) has 1 seeded topic");
  assert(subjectDistribution["PCC-251-COM"] === 2, "DBMS (PCC-251-COM) has 2 seeded topics");
  assert(subjectDistribution["PCC-252-COM"] === 1, "Discrete Mathematics (PCC-252-COM) has 1 seeded topic");

  // Verify existing 81 syllabus items remain unchanged
  const { count: syllabusCount, error: countError } = await supabase
    .from("syllabus_items")
    .select("id", { count: "exact", head: true });

  assert(!countError && syllabusCount === 81, `All 81 official syllabus items remain intact (count: ${syllabusCount})`);

  // ============================================================================
  // 2. Service & API Endpoint Testing
  // ============================================================================
  console.log("\n2. Testing Public API Endpoint: GET /api/curriculum/syllabus-items/[itemId]/topics...");

  // Pick a syllabus item WITH a seeded topic (Data Structures Unit 1 Item 1)
  const itemWithTopic = topics?.find(
    (t) => t.syllabus_items.units.subjects.course_code === "PCC-201-COM" && t.syllabus_items.units.unit_order === 1
  );
  assert(!!itemWithTopic, "Located reference syllabus item with seeded topic");

  const validItemId = itemWithTopic?.syllabus_item_id;

  // Test 2A: Valid Item WITH Topics
  const resWithTopic = await fetch(`${BASE_URL}/api/curriculum/syllabus-items/${validItemId}/topics`);
  assert(resWithTopic.status === 200, "Valid item with topic returns HTTP 200 OK");
  assert(
    resWithTopic.headers.get("content-type")?.includes("application/json"),
    "Response header includes application/json"
  );
  const jsonWithTopic = await resWithTopic.json();
  assert(jsonWithTopic.success === true, "Response has success: true");
  assert(Array.isArray(jsonWithTopic.data), "Response data is an array");
  assert(jsonWithTopic.data.length === 1, "Returns exactly 1 topic for this syllabus item");
  assert(
    jsonWithTopic.data[0]?.normalizedTitle === "Introduction to Data Structures and Abstract Data Types",
    "Topic normalized title matches canonical title"
  );
  assert(jsonWithTopic.data[0]?.displayOrder === 1, "Topic displayOrder is 1");
  assert(jsonWithTopic.data[0]?.status === "published", "Topic status is published");

  // Test 2B: Valid Item WITHOUT Topics (e.g. Data Structures Unit 1 Item 2)
  const { data: itemWithoutTopic } = await supabase
    .from("syllabus_items")
    .select("id, original_order, units!inner(unit_order, subjects!inner(course_code))")
    .eq("units.subjects.course_code", "PCC-201-COM")
    .eq("units.unit_order", 1)
    .eq("original_order", 2)
    .single();

  assert(!!itemWithoutTopic, "Located reference syllabus item without topics");

  const resWithoutTopic = await fetch(
    `${BASE_URL}/api/curriculum/syllabus-items/${itemWithoutTopic.id}/topics`
  );
  assert(resWithoutTopic.status === 200, "Valid item without topic returns HTTP 200 OK");
  const jsonWithoutTopic = await resWithoutTopic.json();
  assert(jsonWithoutTopic.success === true, "Empty topic response has success: true");
  assert(Array.isArray(jsonWithoutTopic.data) && jsonWithoutTopic.data.length === 0, "Returns empty array []");

  // Test 2C: Non-existent Syllabus Item UUID (Expected 404 Not Found)
  const nonexistentUuid = "00000000-0000-0000-0000-000000000000";
  const resNonexistent = await fetch(
    `${BASE_URL}/api/curriculum/syllabus-items/${nonexistentUuid}/topics`
  );
  assert(resNonexistent.status === 404, "Nonexistent syllabus item UUID returns HTTP 404 Not Found");
  const jsonNonexistent = await resNonexistent.json();
  assert(jsonNonexistent.success === false, "404 response has success: false");
  assert(jsonNonexistent.error?.code === "NOT_FOUND", "Error code is NOT_FOUND");

  // Test 2D: Malformed UUID Parameter (Expected 400 Bad Request)
  const malformedId = "invalid-not-a-uuid";
  const resMalformed = await fetch(
    `${BASE_URL}/api/curriculum/syllabus-items/${malformedId}/topics`
  );
  assert(resMalformed.status === 400, "Malformed UUID returns HTTP 400 Bad Request");
  const jsonMalformed = await resMalformed.json();
  assert(jsonMalformed.success === false, "400 response has success: false");
  assert(jsonMalformed.error?.code === "BAD_REQUEST", "Error code is BAD_REQUEST");

  // Test 2E: Security Sanity - Check all 7 topics are queryable through the API
  console.log("\n3. Testing API coverage for all 7 seeded topics...");
  for (const t of topics || []) {
    const r = await fetch(`${BASE_URL}/api/curriculum/syllabus-items/${t.syllabus_item_id}/topics`);
    assert(r.status === 200, `Topic '${t.normalized_title}' API returns 200`);
    const j = await r.json();
    assert(
      j.data?.some((top) => top.normalizedTitle === t.normalized_title),
      `Topic '${t.normalized_title}' is present in API response`
    );
  }

  console.log(`\n======================================================`);
  console.log(`Phase 7A Verification Complete: ${passed} PASSED, ${failed} FAILED`);
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
