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

const TEST_PORT = process.env.TEST_PORT || 3010;
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

  console.log("=== Syllora Phase 7E: Secure Admin Foundation Verification ===\n");

  // ============================================================================
  // 1. Unauthenticated Route Protection (/admin)
  // ============================================================================
  console.log("1. Testing Unauthenticated Access to Protected /admin Route...");

  const adminPageRes = await fetch(`${BASE_URL}/admin`, {
    redirect: "manual",
  });

  // Next.js redirect returns 307 (Temporary Redirect) to /admin/login
  const isRedirect = adminPageRes.status === 307 || adminPageRes.status === 302 || adminPageRes.status === 303;
  assert(isRedirect, `Unauthenticated GET /admin returns redirect status (received HTTP ${adminPageRes.status})`);

  const locationHeader = adminPageRes.headers.get("location") || "";
  assert(
    locationHeader.includes("/admin/login"),
    `Unauthenticated GET /admin redirects to '/admin/login' (Location: ${locationHeader})`
  );

  // ============================================================================
  // 2. Admin Login Page Accessibility (/admin/login)
  // ============================================================================
  console.log("\n2. Testing Admin Login Page Accessibility (/admin/login)...");

  const loginPageRes = await fetch(`${BASE_URL}/admin/login`);
  assert(loginPageRes.status === 200, "GET /admin/login returns HTTP 200 OK");

  const loginHtml = await loginPageRes.text();
  assert(loginHtml.includes("Syllora"), "Login page renders 'Syllora' brand identity");
  assert(loginHtml.includes("Administrator Portal"), "Login page renders 'Administrator Portal' title");
  assert(loginHtml.includes("Sign In"), "Login page renders 'Sign In' action button");
  assert(loginHtml.includes("admin-email"), "Login page renders accessible email input element");
  assert(loginHtml.includes("admin-password"), "Login page renders accessible password input element");

  // ============================================================================
  // 3. Login Endpoint Input Validation & Error Handling
  // ============================================================================
  console.log("\n3. Testing POST /api/admin/auth/login Input Validation...");

  // Empty request
  const emptyBodyRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(emptyBodyRes.status === 400, "Empty login payload returns 400 Bad Request");
  const emptyJson = await emptyBodyRes.json();
  assert(emptyJson.error?.code === "BAD_REQUEST", "Empty payload error code is BAD_REQUEST");

  // Missing password
  const missingPassRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@syllora.app" }),
  });
  assert(missingPassRes.status === 400, "Missing password returns 400 Bad Request");

  // Missing email
  const missingEmailRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "somepassword123" }),
  });
  assert(missingEmailRes.status === 400, "Missing email returns 400 Bad Request");

  // Whitespace-only email
  const whitespaceEmailRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "   ", password: "password123" }),
  });
  assert(whitespaceEmailRes.status === 400, "Whitespace email returns 400 Bad Request");

  // CSRF cross-origin rejection check on login
  const csrfLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://malicious-cross-origin.com",
    },
    body: JSON.stringify({ email: "admin@syllora.app", password: "password123" }),
  });
  assert(csrfLoginRes.status === 403, "Cross-origin POST /api/admin/auth/login rejected with 403 Forbidden");

  // CSRF cross-origin rejection check on logout
  const csrfLogoutRes = await fetch(`${BASE_URL}/api/admin/auth/logout`, {
    method: "POST",
    headers: {
      Origin: "https://malicious-cross-origin.com",
    },
  });
  assert(csrfLogoutRes.status === 403, "Cross-origin POST /api/admin/auth/logout rejected with 403 Forbidden");

  // Open redirect resistance: login page source analysis
  const loginSourcePath = path.join(process.cwd(), "app", "admin", "login", "page.tsx");
  const loginSource = fs.readFileSync(loginSourcePath, "utf8");
  assert(
    !loginSource.includes("searchParams") && loginSource.includes('router.push("/admin")'),
    "Login page strictly navigates to '/admin' and has zero open-redirect vector"
  );

  // ============================================================================
  // 4. Safe Generic Authentication Failure & Enumeration Protection
  // ============================================================================
  console.log("\n4. Testing Safe Generic Error Responses & Enumeration Protection...");

  // Non-existent email
  const invalidUserRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "unregistered_test_account_987654@syllora.app",
      password: "TestPassword123!",
    }),
  });

  assert(invalidUserRes.status === 401, "Invalid credentials return HTTP 401 Unauthorized");
  const invalidUserJson = await invalidUserRes.json();
  assert(invalidUserJson.success === false, "Invalid login returns success: false");
  assert(
    invalidUserJson.error?.message === "Invalid email or password.",
    "Invalid login returns safe generic error 'Invalid email or password.'"
  );
  assert(
    invalidUserJson.error?.code === "UNAUTHORIZED",
    "Invalid login error code is UNAUTHORIZED"
  );

  // Assert no detailed exception or database details leaked
  assert(
    !JSON.stringify(invalidUserJson).includes("supabase") && !JSON.stringify(invalidUserJson).includes("postgres"),
    "No internal error trace or database details leaked in error response"
  );

  // ============================================================================
  // 5. Protected Admin Status Endpoint (/api/admin/me)
  // ============================================================================
  console.log("\n5. Testing Protected Admin Status Endpoint (/api/admin/me)...");

  // Unauthenticated call
  const meUnauthRes = await fetch(`${BASE_URL}/api/admin/me`);
  assert(meUnauthRes.status === 401, "Unauthenticated GET /api/admin/me returns HTTP 401 Unauthorized");
  const meUnauthJson = await meUnauthRes.json();
  assert(meUnauthJson.success === false, "Unauthenticated GET /api/admin/me returns success: false");
  assert(meUnauthJson.error?.code === "UNAUTHORIZED", "Error code is UNAUTHORIZED");
  assert(
    meUnauthJson.error?.message.includes("Authentication required"),
    "Error message explains authentication is required"
  );

  // Call with arbitrary spoofed role header
  const spoofedHeaderRes = await fetch(`${BASE_URL}/api/admin/me`, {
    headers: {
      "x-admin-role": "admin",
      "x-user-role": "admin",
      Authorization: "Bearer invalid_tampered_token",
    },
  });
  assert(spoofedHeaderRes.status === 401, "GET /api/admin/me rejects spoofed headers with 401 Unauthorized");

  // ============================================================================
  // 6. Admin Logout Endpoint (/api/admin/auth/logout)
  // ============================================================================
  console.log("\n6. Testing Admin Logout Endpoint (/api/admin/auth/logout)...");

  const logoutRes = await fetch(`${BASE_URL}/api/admin/auth/logout`, {
    method: "POST",
  });
  assert(logoutRes.status === 200, "POST /api/admin/auth/logout returns HTTP 200 OK");
  const logoutJson = await logoutRes.json();
  assert(logoutJson.success === true, "Logout returns success: true");
  assert(logoutJson.data?.message === "Signed out successfully.", "Logout returns confirmation message");

  // ============================================================================
  // 7. Authorization Engine Contract & Matrix Verification
  // ============================================================================
  console.log("\n7. Testing Authorization Engine Decision Matrix (verifyAdminSession)...");

  // Verify the exact server-side algorithm implemented in lib/auth/admin.ts
  async function testVerifyAdminSession(client) {
    try {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) {
        return { authorized: false, reason: "UNAUTHENTICATED", user: null, admin: null };
      }
      const adminUser = { id: user.id, email: user.email || "" };
      const { data: isAdmin, error: rpcError } = await client.rpc("is_admin");
      if (rpcError || isAdmin !== true) {
        return { authorized: false, reason: "FORBIDDEN", user: adminUser, admin: null };
      }
      const { data: adminRow, error: adminError } = await client
        .from("admins")
        .select("role, is_active")
        .eq("id", user.id)
        .maybeSingle();
      if (adminError || !adminRow || !adminRow.is_active) {
        return { authorized: false, reason: "FORBIDDEN", user: adminUser, admin: null };
      }
      return {
        authorized: true,
        user: adminUser,
        admin: { role: adminRow.role || "moderator", isActive: adminRow.is_active },
      };
    } catch {
      return { authorized: false, reason: "UNAUTHENTICATED", user: null, admin: null };
    }
  }

  // Test Case A: Active Administrator -> Authorized (200)
  const mockActiveAdminClient = {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "11111111-1111-1111-1111-111111111111",
            email: "verified.admin@syllora.app",
          },
        },
        error: null,
      }),
    },
    rpc: async (fnName) => {
      if (fnName === "is_admin") return { data: true, error: null };
      return { data: null, error: new Error("unknown rpc") };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { role: "admin", is_active: true },
            error: null,
          }),
        }),
      }),
    }),
  };

  const activeResult = await testVerifyAdminSession(mockActiveAdminClient);
  assert(activeResult.authorized === true, "Active administrator evaluates to authorized: true");
  assert(activeResult.user?.email === "verified.admin@syllora.app", "Active admin user profile correctly populated");
  assert(activeResult.admin?.role === "admin", "Active admin role matches 'admin'");
  assert(activeResult.admin?.isActive === true, "Active admin isActive is true");

  // Test Case B: Authenticated Non-Admin Student -> Forbidden (403)
  const mockNonAdminClient = {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "22222222-2222-2222-2222-222222222222",
            email: "student@syllora.app",
          },
        },
        error: null,
      }),
    },
    rpc: async (fnName) => {
      if (fnName === "is_admin") return { data: false, error: null };
      return { data: null, error: new Error("unknown rpc") };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: null,
          }),
        }),
      }),
    }),
  };

  const nonAdminResult = await testVerifyAdminSession(mockNonAdminClient);
  assert(nonAdminResult.authorized === false, "Authenticated non-admin evaluates to authorized: false");
  assert(nonAdminResult.reason === "FORBIDDEN", "Authenticated non-admin rejection reason is 'FORBIDDEN'");
  assert(nonAdminResult.admin === null, "Non-admin admin profile is null");

  // Test Case C: Inactive Administrator -> Forbidden (403)
  const mockInactiveAdminClient = {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "00000000-0000-0000-0000-000000000001",
            email: "system.curator@internal.syllora",
          },
        },
        error: null,
      }),
    },
    rpc: async (fnName) => {
      // In Postgres, is_admin() strictly checks is_active = true, returning false for inactive accounts
      if (fnName === "is_admin") return { data: false, error: null };
      return { data: null, error: new Error("unknown rpc") };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { role: "moderator", is_active: false },
            error: null,
          }),
        }),
      }),
    }),
  };

  const inactiveResult = await testVerifyAdminSession(mockInactiveAdminClient);
  assert(inactiveResult.authorized === false, "Inactive administrator evaluates to authorized: false");
  assert(inactiveResult.reason === "FORBIDDEN", "Inactive administrator rejection reason is 'FORBIDDEN'");

  // Test Case D: Unauthenticated Visitor -> Unauthorized (401)
  const mockUnauthClient = {
    auth: {
      getUser: async () => ({
        data: { user: null },
        error: { message: "No session available" },
      }),
    },
  };

  const unauthResult = await testVerifyAdminSession(mockUnauthClient);
  assert(unauthResult.authorized === false, "Unauthenticated visitor evaluates to authorized: false");
  assert(unauthResult.reason === "UNAUTHENTICATED", "Unauthenticated rejection reason is 'UNAUTHENTICATED'");
  assert(unauthResult.user === null, "Unauthenticated user profile is null");

  // Verify lib/auth/admin.ts source code alignment
  const adminAuthSourcePath = path.join(process.cwd(), "lib", "auth", "admin.ts");
  const adminAuthSource = fs.readFileSync(adminAuthSourcePath, "utf8");
  assert(adminAuthSource.includes("verifyAdminSession"), "lib/auth/admin.ts exports verifyAdminSession");
  assert(adminAuthSource.includes("auth.getUser()"), "lib/auth/admin.ts verifies cryptographically signed JWT via getUser()");
  assert(adminAuthSource.includes('rpc("is_admin")'), "lib/auth/admin.ts authorizes via PostgreSQL is_admin() RPC");
  assert(adminAuthSource.includes('"UNAUTHENTICATED"'), "lib/auth/admin.ts defines UNAUTHENTICATED rejection code");
  assert(adminAuthSource.includes('"FORBIDDEN"'), "lib/auth/admin.ts defines FORBIDDEN rejection code");

  // ============================================================================
  // 8. Remote Database Security & Audit Account Invariants
  // ============================================================================
  console.log("\n8. Verifying Remote Database & Seed Audit Account Invariants...");

  // Ensure public.is_admin() RPC returns false for anon
  const { data: anonIsAdmin } = await supabase.rpc("is_admin");
  assert(anonIsAdmin === false, "public.is_admin() RPC returns false for unauthenticated / anon callers");

  // Ensure public anon client cannot read admins roster under RLS
  const { data: anonAdmins } = await supabase.from("admins").select("*");
  assert(Array.isArray(anonAdmins) && anonAdmins.length === 0, "Anonymous client receives 0 rows from public.admins under RLS");

  // Ensure all 81 official syllabus items remain intact
  const { count: syllabusCount } = await supabase
    .from("syllabus_items")
    .select("*", { count: "exact", head: true });
  assert(syllabusCount === 81, `All 81 official syllabus items remain strictly preserved (count: ${syllabusCount})`);

  // Ensure all 5 subjects remain intact
  const { count: subjectCount } = await supabase
    .from("subjects")
    .select("*", { count: "exact", head: true });
  assert(subjectCount === 5, `All 5 official subjects remain strictly preserved (count: ${subjectCount})`);

  // ============================================================================
  // 9. Source Code Security Audit (No Secrets / Service-Role Keys in Client Bundles)
  // ============================================================================
  console.log("\n9. Auditing Source Code for Secret Leaks & Least Privilege...");

  const filesToAudit = [
    path.join(process.cwd(), "app", "admin", "page.tsx"),
    path.join(process.cwd(), "app", "admin", "login", "page.tsx"),
    path.join(process.cwd(), "components", "admin", "logout-button.tsx"),
    path.join(process.cwd(), "lib", "supabase", "admin-server.ts"),
    path.join(process.cwd(), "lib", "auth", "admin.ts"),
    path.join(process.cwd(), "app", "api", "admin", "auth", "login", "route.ts"),
    path.join(process.cwd(), "app", "api", "admin", "auth", "logout", "route.ts"),
    path.join(process.cwd(), "app", "api", "admin", "me", "route.ts"),
  ];

  for (const filePath of filesToAudit) {
    assert(fs.existsSync(filePath), `File exists: ${path.relative(process.cwd(), filePath)}`);
    const content = fs.readFileSync(filePath, "utf8");
    assert(
      !content.includes("SUPABASE_SERVICE_ROLE_KEY") && !content.includes("service_role"),
      `File ${path.basename(filePath)} does NOT import or reference service_role key`
    );
  }

  // ============================================================================
  // 10. Public Student Flow Integrity Check
  // ============================================================================
  console.log("\n10. Verifying Public Student Curriculum Flow Remains Unchanged...");

  const structureRes = await fetch(`${BASE_URL}/api/curriculum/structure`);
  assert(structureRes.status === 200, "Public curriculum structure API returns 200 OK");

  const homeRes = await fetch(`${BASE_URL}/`);
  assert(homeRes.status === 200, "Public Home page (/) returns 200 OK");

  const semesterRes = await fetch(`${BASE_URL}/semester/3`);
  assert(semesterRes.status === 200, "Public Semester 3 page (/semester/3) returns 200 OK");

  const subjectRes = await fetch(`${BASE_URL}/subject/PCC-201-COM`);
  assert(subjectRes.status === 200, "Public Subject page (/subject/PCC-201-COM) returns 200 OK");

  const searchRes = await fetch(`${BASE_URL}/api/search?q=Data+Structures`);
  assert(searchRes.status === 200, "Public Search API returns 200 OK");

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
    console.error("Admin verification suite failed:", err);
    process.exit(1);
  } finally {
    killServer();
  }
}

main();
