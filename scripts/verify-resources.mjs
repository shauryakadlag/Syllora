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

const TEST_PORT = process.env.TEST_PORT || 3008;
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

  console.log("=== Syllora Phase 7C: Learning Resource Engine Verification ===\n");

  // ============================================================================
  // 1. Database & RLS Security Integrity
  // ============================================================================
  console.log("1. Testing Database & RLS Security Integrity...");

  // Query resources via anonymous client
  const { data: anonResources, error: anonResError } = await supabase
    .from("resources")
    .select("id, title, url, type, provider, status");

  assert(!anonResError, `No error querying resources as anon: ${anonResError?.message || "OK"}`);
  assert(
    anonResources && anonResources.length >= 2,
    `Anon client can see verified resources (count: ${anonResources?.length || 0})`
  );

  // Strict RLS check: verify NO unverified (pending/rejected) resources are returned to anon client
  const hasUnverifiedLeak = (anonResources || []).some(
    (r) => r.status !== "verified" || r.title.includes("Draft") || r.title.includes("Low Quality")
  );
  assert(
    !hasUnverifiedLeak,
    "RLS boundary verified: Anon client cannot access pending or rejected resources"
  );

  // Retrieve the canonical target topic (PCC-201-COM Unit 1 Item 1)
  const { data: targetTopics, error: targetTopicError } = await supabase
    .from("learning_topics")
    .select("id, normalized_title")
    .eq("normalized_title", "Introduction to Data Structures and Abstract Data Types")
    .limit(1);

  assert(!targetTopicError && targetTopics?.length === 1, "Located target learning topic in database");
  const targetTopicId = targetTopics?.[0]?.id;

  // Query topic_resources via anon client for this topic
  const { data: topicResRows, error: topicResError } = await supabase
    .from("topic_resources")
    .select(`
      learning_topic_id,
      ranking_score,
      is_featured,
      resources!inner (
        id,
        title,
        url,
        type,
        provider,
        status
      )
    `)
    .eq("learning_topic_id", targetTopicId)
    .order("is_featured", { ascending: false })
    .order("ranking_score", { ascending: false });

  assert(!topicResError, `No error querying topic_resources: ${topicResError?.message || "OK"}`);
  assert(
    topicResRows && topicResRows.length === 2,
    `Exactly 2 verified resources linked to target topic under anon RLS (found: ${topicResRows?.length || 0})`
  );

  // Verify featured resource is ordered first
  const firstRow = topicResRows?.[0];
  const secondRow = topicResRows?.[1];
  assert(
    firstRow?.is_featured === true && firstRow?.ranking_score === 100,
    "Featured resource has is_featured=true and ranking_score=100 (ranked #1)"
  );
  assert(
    secondRow?.is_featured === false && secondRow?.ranking_score === 90,
    "Non-featured resource has is_featured=false and ranking_score=90 (ranked #2)"
  );

  // ============================================================================
  // 2. Resource API Route Contract & Deterministic Sorting
  // ============================================================================
  console.log("\n2. Testing Resource API Route Contract & Deterministic Sorting...");

  const validApiRes = await fetch(`${BASE_URL}/api/curriculum/topics/${targetTopicId}/resources`);
  assert(validApiRes.status === 200, `GET /api/curriculum/topics/${targetTopicId}/resources returns 200 OK`);

  const validApiJson = await validApiRes.json();
  assert(validApiJson.success === true, "API response has success === true");
  assert(Array.isArray(validApiJson.data), "API response data is an array");
  assert(validApiJson.data.length === 2, `API returns exactly 2 resources for target topic (found: ${validApiJson.data.length})`);

  const res1 = validApiJson.data[0];
  const res2 = validApiJson.data[1];

  assert(res1.title === "Introduction to Data Structures", "Resource 1 title is 'Introduction to Data Structures'");
  assert(res1.isFeatured === true, "Resource 1 isFeatured === true");
  assert(res1.rankingScore === 100, "Resource 1 rankingScore === 100");
  assert(res1.type === "article", "Resource 1 type is 'article'");
  assert(res1.provider === "GeeksforGeeks", "Resource 1 provider is 'GeeksforGeeks'");
  assert(res1.status === "verified", "Resource 1 status is 'verified'");

  assert(res2.title === "Abstract Data Types (ADTs)", "Resource 2 title is 'Abstract Data Types (ADTs)'");
  assert(res2.isFeatured === false, "Resource 2 isFeatured === false");
  assert(res2.rankingScore === 90, "Resource 2 rankingScore === 90");
  assert(res2.type === "documentation", "Resource 2 type is 'documentation'");
  assert(res2.provider === "GeeksforGeeks", "Resource 2 provider is 'GeeksforGeeks'");
  assert(res2.status === "verified", "Resource 2 status is 'verified'");

  // ============================================================================
  // 3. Negative Visibility Tests (Pending & Rejected Resources Hidden)
  // ============================================================================
  console.log("\n3. Testing Negative Visibility (Pending & Rejected Resources Excluded)...");

  const allReturnedTitles = validApiJson.data.map((r) => r.title);
  assert(
    !allReturnedTitles.includes("Data Structures Draft Guide"),
    "Pending resource 'Data Structures Draft Guide' is strictly excluded from student API"
  );
  assert(
    !allReturnedTitles.includes("Low Quality Reference Material"),
    "Rejected resource 'Low Quality Reference Material' is strictly excluded from student API"
  );

  // ============================================================================
  // 4. Topic Without Resources Returns Empty Array
  // ============================================================================
  console.log("\n4. Testing Topic Without Resources (Clean Empty State)...");

  // Find another topic with 0 resources
  const { data: otherTopics } = await supabase
    .from("learning_topics")
    .select("id, normalized_title")
    .neq("id", targetTopicId)
    .limit(1);

  assert(otherTopics && otherTopics.length === 1, "Located second learning topic without resources");
  const otherTopicId = otherTopics?.[0]?.id;

  const emptyTopicRes = await fetch(`${BASE_URL}/api/curriculum/topics/${otherTopicId}/resources`);
  assert(emptyTopicRes.status === 200, "Topic without resources returns 200 OK");
  const emptyTopicJson = await emptyTopicRes.json();
  assert(emptyTopicJson.success === true, "Topic without resources returns success: true");
  assert(
    Array.isArray(emptyTopicJson.data) && emptyTopicJson.data.length === 0,
    "Topic without resources returns an empty array []"
  );

  // ============================================================================
  // 5. Input Validation & Error Handling
  // ============================================================================
  console.log("\n5. Testing Input Validation & Error Handling...");

  // Malformed UUID -> 400 Bad Request
  const badUuidRes = await fetch(`${BASE_URL}/api/curriculum/topics/invalid-uuid-12345/resources`);
  assert(badUuidRes.status === 400, "Malformed topic UUID returns 400 Bad Request");
  const badUuidJson = await badUuidRes.json();
  assert(badUuidJson.success === false, "Malformed UUID returns success: false");
  assert(badUuidJson.error?.code === "BAD_REQUEST", "Malformed UUID error code is BAD_REQUEST");

  // Nonexistent valid UUID -> 404 Not Found
  const nfUuidRes = await fetch(`${BASE_URL}/api/curriculum/topics/00000000-0000-0000-0000-000000000999/resources`);
  assert(nfUuidRes.status === 404, "Nonexistent topic UUID returns 404 Not Found");
  const nfUuidJson = await nfUuidRes.json();
  assert(nfUuidJson.success === false, "Nonexistent topic returns success: false");
  assert(nfUuidJson.error?.code === "NOT_FOUND", "Nonexistent topic error code is NOT_FOUND");

  // ============================================================================
  // 6. Security & URL Protocol Validation
  // ============================================================================
  console.log("\n6. Testing URL Protocol Safety...");

  for (const item of validApiJson.data) {
    const isSafe = item.url.startsWith("http://") || item.url.startsWith("https://");
    assert(isSafe, `Resource "${item.title}" URL protocol is safe: ${item.url}`);
    assert(!item.url.toLowerCase().startsWith("javascript:"), `Resource "${item.title}" has no javascript: protocol`);
  }

  // ============================================================================
  // 7. Student UI Component Source-Level Sanity Check
  // ============================================================================
  console.log("\n7. Testing Student UI Component Wiring (Source-Level Sanity Check)...");

  const subjectPagePath = path.join(process.cwd(), "app", "subject", "[courseCode]", "page.tsx");
  const subjectPageSource = fs.readFileSync(subjectPagePath, "utf8");

  assert(
    subjectPageSource.includes("resourcesByTopic") && subjectPageSource.includes("setResourcesByTopic"),
    "Subject page manages resourcesByTopic client state"
  );
  assert(
    subjectPageSource.includes("/api/curriculum/topics/") && subjectPageSource.includes("/resources"),
    "Subject page queries the curriculum topic resources API"
  );
  assert(
    subjectPageSource.includes('target="_blank"') && subjectPageSource.includes('rel="noopener noreferrer"'),
    "External resource links use target='_blank' and rel='noopener noreferrer'"
  );
  assert(
    subjectPageSource.includes("topicResources.length > 0"),
    "Resource container is conditionally rendered only when topic has verified resources"
  );
  assert(
    subjectPageSource.includes("getResourceTypeIcon"),
    "Subject page maps resource types to appropriate iconography"
  );
  assert(
    subjectPageSource.includes("Featured"),
    "Subject page includes visual badge for featured resources"
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
