import { createClient } from "@supabase/supabase-js";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

// 1. Read environment variables
const envPath = path.join(process.cwd(), ".env.local");
let supabaseUrl = "";
let supabaseAnonKey = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      supabaseUrl = trimmed.split("=")[1].trim();
    }
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) {
      supabaseAnonKey = trimmed.split("=")[1].trim();
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const TEST_PORT = 3020;
const BASE_URL = `http://localhost:${TEST_PORT}`;
let serverProcess = null;

function killServer() {
  if (serverProcess) {
    console.log("Stopping Next.js test server...");
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /pid ${serverProcess.pid} /f /t`, { stdio: "ignore" });
      } else {
        serverProcess.kill("SIGTERM");
      }
    } catch {
      // process might have already exited
    }
    serverProcess = null;
  }
}

process.on("exit", killServer);
process.on("SIGINT", () => {
  killServer();
  process.exit(1);
});
process.on("SIGTERM", () => {
  killServer();
  process.exit(1);
});

async function httpFetch(url, options = {}) {
  const headers = { ...options.headers, Connection: "close" };
  try {
    return await fetch(url, { ...options, headers });
  } catch (err) {
    if (err?.cause?.code === "ECONNRESET" || err?.message?.includes("ECONNRESET")) {
      await new Promise((r) => setTimeout(r, 200));
      return await fetch(url, { ...options, headers });
    }
    throw err;
  }
}

async function startServer() {
  console.log(`Starting Next.js test server on port ${TEST_PORT}...`);
  serverProcess = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(TEST_PORT) },
    shell: true,
    stdio: "pipe",
  });

  let started = false;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    serverProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes("Ready in") || msg.includes("started server") || msg.includes("http://localhost:")) {
        if (!started) {
          started = true;
          console.log("Test server is ready.");
          resolve();
        }
      }
    });

    serverProcess.stderr.on("data", (data) => {
      // ignore normal stderr logs
    });

    serverProcess.on("error", (err) => {
      reject(new Error(`Failed to spawn test server: ${err.message}`));
    });

    // Poll for readiness
    const interval = setInterval(async () => {
      if (Date.now() - startTime > 35000) {
        clearInterval(interval);
        reject(new Error("Timeout waiting for test server to start"));
        return;
      }
      try {
        const res = await httpFetch(`${BASE_URL}/api/curriculum/semesters/3/subjects`);
        if (res.ok && !started) {
          started = true;
          clearInterval(interval);
          console.log("Test server is reachable.");
          resolve();
        }
      } catch {
        // keep waiting
      }
    }, 500);
  });
}

function runSupabaseQuery(sql) {
  const tempSqlFile = path.join(process.cwd(), "scripts", "_temp_query_student_progress.sql");
  try {
    fs.writeFileSync(tempSqlFile, sql, "utf8");
    const out = execSync(`npx supabase db query --linked -f "${tempSqlFile}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const jsonMatch = out.match(/\{[\s\S]*"rows":\s*(\[[^\]]*\])[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.rows || [];
    }
    return [];
  } finally {
    if (fs.existsSync(tempSqlFile)) {
      try {
        fs.unlinkSync(tempSqlFile);
      } catch {
        // ignore
      }
    }
  }
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("================================================================================");
  console.log("SYLLORA PHASE 8C - STUDENT ACCOUNTS & LEARNING PROGRESS VERIFICATION");
  console.log("================================================================================");

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 1: Database Schema & Row Level Security
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 1: Database Schema & Row Level Security ---");

  // 1.1 Check student_topic_progress exists and is accessible via PostgREST
  const { data: anonData, error: anonError } = await supabase
    .from("student_topic_progress")
    .select("*");

  assert(!anonError, `student_topic_progress query executed without error: ${anonError?.message || "none"}`);
  assert(Array.isArray(anonData), "Anonymous select returns an array (empty due to RLS)");
  assert(anonData.length === 0, `Anonymous client cannot view any student progress rows (RLS active, got ${anonData.length} rows)`);

  // 1.2 Attempt unauthenticated anonymous insert -> Must be blocked by RLS
  const { error: insertError } = await supabase
    .from("student_topic_progress")
    .insert({
      user_id: "00000000-0000-0000-0000-000000000001",
      topic_id: "00000000-0000-0000-0000-000000000002",
    });

  assert(
    !!insertError,
    `Anonymous insert to student_topic_progress blocked by RLS: ${insertError?.message || "error returned"}`
  );

  // 1.3 Verify table columns and constraints via Postgres metadata
  const columns = runSupabaseQuery(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_topic_progress'
    ORDER BY ordinal_position;
  `);
  assert(columns.length === 3, "student_topic_progress has exactly 3 columns (user_id, topic_id, completed_at)");
  assert(columns.some((c) => c.column_name === "user_id" && c.data_type === "uuid"), "user_id is UUID");
  assert(columns.some((c) => c.column_name === "topic_id" && c.data_type === "uuid"), "topic_id is UUID");
  assert(columns.some((c) => c.column_name === "completed_at" && c.data_type.includes("timestamp")), "completed_at is TIMESTAMPTZ");

  // 1.4 Verify RLS policies on student_topic_progress
  const policies = runSupabaseQuery(`
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_topic_progress'
    ORDER BY policyname;
  `);
  assert(policies.length === 3, `student_topic_progress has exactly 3 RLS policies (got ${policies.length})`);
  assert(policies.some((p) => p.policyname === "Students view own progress" && p.cmd === "SELECT"), "SELECT policy: Students view own progress");
  assert(policies.some((p) => p.policyname === "Students insert own progress" && p.cmd === "INSERT"), "INSERT policy: Students insert own progress");
  assert(policies.some((p) => p.policyname === "Students delete own progress" && p.cmd === "DELETE"), "DELETE policy: Students delete own progress");

  // 1.5 Verify migration tracking in remote Supabase project
  try {
    const migOutput = execSync("npx supabase migration list", { encoding: "utf8" });
    assert(
      migOutput.includes("20260914150000"),
      "Migration 20260914150000_student_topic_progress.sql is recorded in migration history"
    );
  } catch (err) {
    console.warn("Could not check migration list via CLI:", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: Security & Architecture Integrity
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: Security & Architecture Integrity ---");

  // 2.1 Verify inactive audit account
  const auditAccountCheck = runSupabaseQuery(`
    SELECT id, is_active FROM public.admins WHERE id = '00000000-0000-0000-0000-000000000001';
  `);
  assert(
    auditAccountCheck.length === 1 && auditAccountCheck[0].is_active === false,
    "Audit identity 00000000-0000-0000-0000-000000000001 remains is_active = false"
  );

  // 2.2 Verify zero service-role keys in codebase
  const filesToCheck = [
    "lib/auth/student.ts",
    "lib/supabase/student-server.ts",
    "lib/services/student-progress.ts",
    "app/api/student/auth/login/route.ts",
    "app/api/student/auth/signup/route.ts",
    "app/api/student/auth/logout/route.ts",
    "app/api/student/auth/me/route.ts",
    "app/api/student/progress/route.ts",
    "app/api/student/progress/[topicId]/route.ts",
  ];

  for (const f of filesToCheck) {
    const fullPath = path.join(process.cwd(), f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      assert(!content.includes("service_role") && !content.includes("SUPABASE_SERVICE_ROLE_KEY"), `${f} contains zero service-role references`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Student Auth API Endpoints
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: Student Auth API Endpoints ---");

  // 3.1 GET /api/student/auth/me unauthenticated
  const meRes = await httpFetch(`${BASE_URL}/api/student/auth/me`);
  assert(meRes.status === 200, "GET /api/student/auth/me returns 200");
  const meJson = await meRes.json();
  assert(meJson.success === true, "GET /api/student/auth/me success is true");
  assert(meJson.data.authenticated === false, "Unauthenticated session correctly identified as authenticated: false");
  assert(meJson.data.user === null, "Unauthenticated session user is null");

  // 3.2 POST /api/student/auth/login validation
  const emptyLoginRes = await httpFetch(`${BASE_URL}/api/student/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(emptyLoginRes.status === 400, "Login without credentials returns 400 Bad Request");

  const badLoginRes = await httpFetch(`${BASE_URL}/api/student/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nonexistent.student@example.com", password: "wrongpassword123" }),
  });
  assert(badLoginRes.status === 401, "Login with invalid credentials returns 401 Unauthorized");
  const badLoginJson = await badLoginRes.json();
  assert(badLoginJson.error.code === "UNAUTHORIZED", "Invalid login returns code UNAUTHORIZED");

  // 3.3 POST /api/student/auth/signup validation
  const invalidEmailSignupRes = await httpFetch(`${BASE_URL}/api/student/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "validpassword123" }),
  });
  assert(invalidEmailSignupRes.status === 400, "Signup with invalid email format returns 400 Bad Request");

  const shortPassSignupRes = await httpFetch(`${BASE_URL}/api/student/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "valid.student@example.com", password: "123" }),
  });
  assert(shortPassSignupRes.status === 400, "Signup with password < 6 characters returns 400 Bad Request");

  // 3.4 POST /api/student/auth/logout without session
  const logoutRes = await httpFetch(`${BASE_URL}/api/student/auth/logout`, {
    method: "POST",
  });
  assert(logoutRes.status === 200, "Logout endpoint returns 200");
  const logoutJson = await logoutRes.json();
  assert(logoutJson.success === true, "Logout success is true");

  // 3.5 CSRF defense on auth routes
  const csrfLoginRes = await httpFetch(`${BASE_URL}/api/student/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://malicious-site.com",
      host: `localhost:${TEST_PORT}`,
    },
    body: JSON.stringify({ email: "student@example.com", password: "password" }),
  });
  assert(csrfLoginRes.status === 403, "Login rejects mismatching cross-origin requests with 403 Forbidden");

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Student Progress API Endpoints
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: Student Progress API Endpoints ---");

  // 4.1 GET /api/student/progress without authentication -> 401
  const unauthProgRes = await httpFetch(`${BASE_URL}/api/student/progress`);
  assert(unauthProgRes.status === 401, "GET /api/student/progress without auth returns 401 Unauthorized");
  const unauthProgJson = await unauthProgRes.json();
  assert(unauthProgJson.error.code === "UNAUTHORIZED", "Unauth progress query returns code UNAUTHORIZED");

  // 4.2 POST /api/student/progress/[topicId] without authentication -> 401
  const unauthMarkRes = await httpFetch(`${BASE_URL}/api/student/progress/00000000-0000-0000-0000-000000000001`, {
    method: "POST",
  });
  assert(unauthMarkRes.status === 401, "POST /api/student/progress/[topicId] without auth returns 401 Unauthorized");

  // 4.3 DELETE /api/student/progress/[topicId] without authentication -> 401
  const unauthDeleteRes = await httpFetch(`${BASE_URL}/api/student/progress/00000000-0000-0000-0000-000000000001`, {
    method: "DELETE",
  });
  assert(unauthDeleteRes.status === 401, "DELETE /api/student/progress/[topicId] without auth returns 401 Unauthorized");

  // 4.4 CSRF defense on progress endpoints
  const csrfProgressRes = await httpFetch(`${BASE_URL}/api/student/progress/00000000-0000-0000-0000-000000000001`, {
    method: "POST",
    headers: {
      origin: "https://evil.attacker.com",
      host: `localhost:${TEST_PORT}`,
    },
  });
  assert(csrfProgressRes.status === 403, "POST progress rejects mismatching cross-origin requests with 403 Forbidden");

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: Preserved Public Curriculum Experience (Unauthenticated)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 5: Preserved Public Curriculum Experience ---");

  // 5.1 Public subjects endpoint works without login
  const subjectsRes = await httpFetch(`${BASE_URL}/api/curriculum/semesters/3/subjects`);
  assert(subjectsRes.status === 200, "GET /api/curriculum/semesters/3/subjects returns 200 without login");
  const subjectsJson = await subjectsRes.json();
  assert(subjectsJson.success && subjectsJson.data.length > 0, "Subjects retrieved successfully for unauthenticated visitor");

  // 5.2 Public subject detail works without login
  const subjectDetailRes = await httpFetch(`${BASE_URL}/api/curriculum/subjects/PCC-201-COM`);
  assert(subjectDetailRes.status === 200, "GET /api/curriculum/subjects/PCC-201-COM returns 200 without login");
  const subjectDetailJson = await subjectDetailRes.json();
  assert(subjectDetailJson.success && subjectDetailJson.data.units.length > 0, "Subject units & syllabus retrieved without login");

  // 5.3 Public resource search works without login
  const searchRes = await httpFetch(`${BASE_URL}/api/search?q=database`);
  assert(searchRes.status === 200, "GET /api/search returns 200 without login");
  const searchJson = await searchRes.json();
  assert(searchJson.success, "Search returns verified resources without login");

  // 5.4 Resource reporting remains functional without student login
  const reportRes = await httpFetch(`${BASE_URL}/api/resources/00000000-0000-0000-0000-000000000000/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: "other",
      description: "Automated verification test report (unauthenticated student)",
    }),
  });
  // 404 because dummy UUID is not in resources table, proving route is reached without auth requirement!
  assert(reportRes.status === 404, "Student reporting endpoint accessible without authentication (returns 404 for nonexistent resource)");

  console.log("\n================================================================================");
  console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} tests passed!`);
  console.log("================================================================================");
}

async function main() {
  try {
    await startServer();
    await runTests();
  } catch (err) {
    console.error("\nTEST SUITE FAILED:", err);
    process.exitCode = 1;
  } finally {
    killServer();
    process.exit(process.exitCode || 0);
  }
}

main();
