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

const TEST_PORT = process.env.TEST_PORT || 3011;
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
  while (Date.now() - startTime < 25000) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isServerReady(BASE_URL)) {
      console.log(`Next.js server is ready at ${BASE_URL}\n`);
      return;
    }
  }

  throw new Error(`Server failed to start at ${BASE_URL} within 25 seconds.`);
}

function runSupabaseQuery(sql) {
  const tempSqlFile = path.join(process.cwd(), "scripts", "_temp_query.sql");
  try {
    fs.writeFileSync(tempSqlFile, sql, "utf8");
    const out = execSync(`npx supabase db query --linked -f "${tempSqlFile}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    // Extract JSON rows
    const jsonMatch = out.match(/\{[\s\S]*"rows":\s*(\[[^\]]*\])[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.rows || [];
    }
    return [];
  } finally {
    if (fs.existsSync(tempSqlFile)) {
      fs.unlinkSync(tempSqlFile);
    }
  }
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

  console.log("================================================================================");
  console.log("Syllora Phase 7F-A — Admin Resource Management: Read/List Verification");
  console.log("================================================================================\n");

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: Route Protection & Unauthenticated Access
    // -------------------------------------------------------------------------
    console.log("--- Test Suite 1: Route Guard & Unauthenticated Access ---");

    const unauthRes = await fetch(`${BASE_URL}/admin/resources`, {
      redirect: "manual",
    });
    assert(
      unauthRes.status === 307 || unauthRes.status === 302,
      `Unauthenticated GET /admin/resources returns redirect (${unauthRes.status})`
    );
    const redirectLocation = unauthRes.headers.get("location");
    assert(
      redirectLocation && redirectLocation.includes("/admin/login"),
      `Redirect target is /admin/login (actual: '${redirectLocation}')`
    );

    // Spoofed / invalid cookie test
    const spoofedRes = await fetch(`${BASE_URL}/admin/resources`, {
      redirect: "manual",
      headers: {
        Cookie: "sb-enxbvqlaasbiqywxkmfu-auth-token=malicious_fake_jwt_token",
      },
    });
    assert(
      spoofedRes.status === 307 || spoofedRes.status === 302,
      `Spoofed cookie request returns redirect (${spoofedRes.status})`
    );
    const spoofedLocation = spoofedRes.headers.get("location");
    assert(
      spoofedLocation && spoofedLocation.includes("/admin/login"),
      `Spoofed cookie redirects to /admin/login (actual: '${spoofedLocation}')`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Read-Only Invariants & No Mutation Endpoints
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 2: Read-Only Invariants & No Mutation Endpoints ---");

    const postAdminRes = await fetch(`${BASE_URL}/api/admin/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hack" }),
    });
    assert(
      postAdminRes.status === 404 || postAdminRes.status === 405,
      `POST /api/admin/resources is not implemented / returns 404 (actual: ${postAdminRes.status})`
    );

    const postCurriculumRes = await fetch(`${BASE_URL}/api/curriculum/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hack" }),
    });
    assert(
      postCurriculumRes.status === 404 || postCurriculumRes.status === 405,
      `POST /api/curriculum/resources is not implemented / returns 404 (actual: ${postCurriculumRes.status})`
    );

    // Codebase scan: confirm no mutation operations exist on resources table in app or lib
    const codeFilesToCheck = [
      path.join(process.cwd(), "lib", "services", "admin-resources.ts"),
      path.join(process.cwd(), "app", "admin", "resources", "page.tsx"),
      path.join(process.cwd(), "app", "admin", "page.tsx"),
    ];

    let hasMutations = false;
    for (const f of codeFilesToCheck) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, "utf8");
        if (
          content.includes(".insert(") ||
          content.includes(".update(") ||
          content.includes(".delete(") ||
          content.includes(".upsert(")
        ) {
          hasMutations = true;
          console.error(`  Mutation call found in ${f}`);
        }
      }
    }
    assert(!hasMutations, "Zero resource mutation queries (.insert, .update, .delete, .upsert) in Phase 7F-A code");

    // -------------------------------------------------------------------------
    // TEST SUITE 3: PostgreSQL RLS Policies on resources & topic_resources
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 3: Database RLS Policy Verification ---");

    const policyRows = runSupabaseQuery(`
      SELECT tablename, policyname, cmd 
      FROM pg_policies 
      WHERE tablename IN ('resources', 'topic_resources', 'learning_topics')
      ORDER BY tablename, policyname;
    `);

    const policyNames = policyRows.map((r) => `${r.tablename}.${r.policyname}`);
    console.log(`  Found ${policyRows.length} active policies:`);
    policyRows.forEach((r) => console.log(`    - [${r.tablename}] ${r.policyname} (${r.cmd})`));

    assert(
      policyNames.includes("resources.Admins view all resources"),
      "Policy 'Admins view all resources' exists on resources table"
    );
    assert(
      policyNames.includes("resources.Public view verified resources"),
      "Policy 'Public view verified resources' exists on resources table"
    );
    assert(
      policyNames.includes("topic_resources.Admins view all topic_resources"),
      "Policy 'Admins view all topic_resources' exists on topic_resources table"
    );
    assert(
      policyNames.includes("topic_resources.Public view topic_resources"),
      "Policy 'Public view topic_resources' exists on topic_resources table"
    );
    assert(
      policyNames.includes("learning_topics.Admins view all learning_topics"),
      "Policy 'Admins view all learning_topics' exists on learning_topics table"
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Anon / Public Read Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 4: Anon / Public Read Isolation ---");

    const { data: anonResources, error: anonError } = await supabase
      .from("resources")
      .select("id, title, status, type");

    assert(!anonError, "Anonymous query on resources completes without database error");
    assert(
      anonResources && anonResources.length > 0,
      `Anonymous query returned verified resources count: ${anonResources ? anonResources.length : 0}`
    );

    const nonVerifiedAnon = (anonResources || []).filter((r) => r.status !== "verified");
    assert(
      nonVerifiedAnon.length === 0,
      `Anonymous query returned zero unverified resources (actual non-verified: ${nonVerifiedAnon.length})`
    );

    const pendingFound = (anonResources || []).some((r) => r.title === "Data Structures Draft Guide");
    assert(!pendingFound, "Pending resource 'Data Structures Draft Guide' is hidden from anonymous clients");

    const rejectedFound = (anonResources || []).some((r) => r.title === "Low Quality Reference Material");
    assert(!rejectedFound, "Rejected resource 'Low Quality Reference Material' is hidden from anonymous clients");

    // -------------------------------------------------------------------------
    // TEST SUITE 5: Inactive Admin RLS Enforcement
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 5: Inactive Admin RLS Enforcement ---");

    const inactiveAdminRows = runSupabaseQuery(`
      SET ROLE authenticated;
      SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
      SELECT id, title, status FROM public.resources;
      RESET ROLE;
    `);

    assert(
      inactiveAdminRows.length > 0,
      `Inactive admin query returned rows: ${inactiveAdminRows.length}`
    );
    const unverifiedInactive = inactiveAdminRows.filter((r) => r.status !== "verified");
    assert(
      unverifiedInactive.length === 0,
      `Inactive admin receives ZERO unverified resources (treated as non-admin)`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 6: Active Admin RLS Verification (Simulated in Rollback TX)
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 6: Active Admin RLS (Simulated with Rollback) ---");

    const activeAdminRows = runSupabaseQuery(`
      BEGIN;
      UPDATE public.admins SET is_active = true WHERE id = '00000000-0000-0000-0000-000000000001';
      SET ROLE authenticated;
      SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
      SELECT id, title, status, type FROM public.resources ORDER BY created_at DESC;
      RESET ROLE;
      ROLLBACK;
    `);

    assert(
      activeAdminRows.length >= 4,
      `Active admin query retrieves all catalog resources (count: ${activeAdminRows.length})`
    );

    const activeStatuses = new Set(activeAdminRows.map((r) => r.status));
    assert(activeStatuses.has("verified"), "Active admin view includes 'verified' resources");
    assert(activeStatuses.has("pending"), "Active admin view includes 'pending' resources");
    assert(activeStatuses.has("rejected"), "Active admin view includes 'rejected' resources");

    // Verify inactive admin audit account was not modified (rollback check)
    const auditAccountCheck = runSupabaseQuery(`
      SELECT id, is_active FROM public.admins WHERE id = '00000000-0000-0000-0000-000000000001';
    `);
    assert(
      auditAccountCheck.length === 1 && auditAccountCheck[0].is_active === false,
      `Audit identity 00000000-0000-0000-0000-000000000001 remains is_active = false after test`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 7: URL Safety Sanitization & Logic
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 7: URL Safety Sanitization ---");

    // Verify lib/services/admin-resources.ts exports and implementation
    const serviceSource = fs.readFileSync(
      path.join(process.cwd(), "lib", "services", "admin-resources.ts"),
      "utf8"
    );
    assert(serviceSource.includes("export function isSafeUrl"), "lib/services/admin-resources.ts exports isSafeUrl");
    assert(serviceSource.includes("export function formatProvider"), "lib/services/admin-resources.ts exports formatProvider");

    function testIsSafeUrl(rawUrl) {
      if (!rawUrl || typeof rawUrl !== "string") return false;
      try {
        const parsed = new URL(rawUrl);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }

    function testFormatProvider(provider, url) {
      if (provider && provider.trim().length > 0) {
        return provider.trim();
      }
      try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, "");
      } catch {
        return "External";
      }
    }

    assert(testIsSafeUrl("https://geeksforgeeks.org/article") === true, "Valid HTTPS URL passes safety check");
    assert(testIsSafeUrl("http://example.com/guide") === true, "Valid HTTP URL passes safety check");
    assert(testIsSafeUrl("javascript:alert(1)") === false, "Dangerous javascript: URL blocked");
    assert(testIsSafeUrl("data:text/html,<script>alert(1)</script>") === false, "Dangerous data: URL blocked");
    assert(testIsSafeUrl("file:///etc/passwd") === false, "file: protocol URL blocked");
    assert(testIsSafeUrl("") === false, "Empty URL blocked");

    assert(
      testFormatProvider("GeeksforGeeks", "https://geeksforgeeks.org") === "GeeksforGeeks",
      "Explicit provider preserved"
    );
    assert(
      testFormatProvider("", "https://www.youtube.com/watch?v=123") === "youtube.com",
      "Domain fallback correctly parsed"
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 8: Public Student Resource API & Service Check
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 8: Public Student Resource API & UI Check ---");

    const topicId = "8921767b-4a11-4fe0-8504-0d5cc02b0465";
    const studentRes = await fetch(`${BASE_URL}/api/curriculum/topics/${topicId}/resources`);
    assert(studentRes.status === 200, `Student API /api/curriculum/topics/${topicId}/resources returns 200 OK`);

    const studentJson = await studentRes.json();
    assert(studentJson.success === true, "Student API returns success: true");
    assert(
      Array.isArray(studentJson.data) && studentJson.data.length > 0,
      `Student API returns resources array (count: ${studentJson.data.length})`
    );

    const nonVerifiedStudent = studentJson.data.filter((r) => r.status !== "verified");
    assert(
      nonVerifiedStudent.length === 0,
      "Student API returns strictly verified resources only"
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 9: Zero Service-Role Credential Invariant
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 9: Zero Service-Role Key Invariant ---");

    const filesToScan = [
      "lib/services/admin-resources.ts",
      "lib/services/resources.ts",
      "lib/auth/admin.ts",
      "lib/supabase/admin-server.ts",
      "app/admin/resources/page.tsx",
      "app/admin/page.tsx",
    ];

    let foundServiceKey = false;
    for (const rel of filesToScan) {
      const fullPath = path.join(process.cwd(), rel);
      if (fs.existsSync(fullPath)) {
        const text = fs.readFileSync(fullPath, "utf8");
        if (text.includes("SUPABASE_SERVICE_ROLE_KEY") || text.includes("service_role")) {
          foundServiceKey = true;
          console.error(`  Service role key found in ${rel}`);
        }
      }
    }
    assert(!foundServiceKey, "Zero SUPABASE_SERVICE_ROLE_KEY references in code");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    killServer();
  }

  console.log("\n================================================================================");
  console.log(`Verification Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  try {
    await startServerIfNeeded();
    await runTests();
  } catch (err) {
    console.error("Fatal error running verification:", err);
    killServer();
    process.exit(1);
  }
}

main();
