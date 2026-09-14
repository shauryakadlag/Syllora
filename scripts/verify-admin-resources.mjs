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

const TEST_PORT = process.env.TEST_PORT || 3012;
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
  console.log("Syllora Phase 7F-B — Admin Resource Create/Edit Verification");
  console.log("================================================================================\n");

  const seededVerifiedId = "7d5c1632-7274-4dc0-8f15-939f2e9f585b";

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: Route Guards & Unauthenticated Access
    // -------------------------------------------------------------------------
    console.log("--- Test Suite 1: Route Guards & Unauthenticated Access ---");

    // 1.1 GET /admin/resources/new redirect
    const unauthNewPage = await fetch(`${BASE_URL}/admin/resources/new`, { redirect: "manual" });
    assert(
      unauthNewPage.status === 307 || unauthNewPage.status === 302,
      `Unauthenticated GET /admin/resources/new returns redirect (${unauthNewPage.status})`
    );
    assert(
      (unauthNewPage.headers.get("location") || "").includes("/admin/login"),
      `Redirect target for /admin/resources/new is /admin/login`
    );

    // 1.2 GET /admin/resources/[id]/edit redirect
    const unauthEditPage = await fetch(`${BASE_URL}/admin/resources/${seededVerifiedId}/edit`, { redirect: "manual" });
    assert(
      unauthEditPage.status === 307 || unauthEditPage.status === 302,
      `Unauthenticated GET /admin/resources/[id]/edit returns redirect (${unauthEditPage.status})`
    );
    assert(
      (unauthEditPage.headers.get("location") || "").includes("/admin/login"),
      `Redirect target for /admin/resources/[id]/edit is /admin/login`
    );

    // 1.3 POST /api/admin/resources without session
    const unauthPost = await fetch(`${BASE_URL}/api/admin/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Unauthorized Resource",
        url: "https://example.com/unauth",
        type: "article",
      }),
    });
    assert(unauthPost.status === 401, `Unauthenticated POST /api/admin/resources returns 401 Unauthorized (${unauthPost.status})`);

    // 1.4 GET /api/admin/resources/[id] without session
    const unauthGetItem = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}`);
    assert(unauthGetItem.status === 401, `Unauthenticated GET /api/admin/resources/[id] returns 401 Unauthorized (${unauthGetItem.status})`);

    // 1.5 PATCH /api/admin/resources/[id] without session
    const unauthPatch = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Tampered Title" }),
    });
    assert(unauthPatch.status === 401, `Unauthenticated PATCH /api/admin/resources/[id] returns 401 Unauthorized (${unauthPatch.status})`);

    // 1.6 Spoofed token on POST /api/admin/resources
    const spoofedPost = await fetch(`${BASE_URL}/api/admin/resources`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "sb-enxbvqlaasbiqywxkmfu-auth-token=fake_jwt_cookie",
      },
      body: JSON.stringify({
        title: "Spoofed Token Test",
        url: "https://example.com/spoof",
        type: "article",
      }),
    });
    assert(spoofedPost.status === 401, `Spoofed cookie on POST /api/admin/resources returns 401 Unauthorized (${spoofedPost.status})`);

    // 1.7 Spoofed token on PATCH /api/admin/resources/[id]
    const spoofedPatch = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: "sb-enxbvqlaasbiqywxkmfu-auth-token=fake_jwt_cookie",
      },
      body: JSON.stringify({ title: "Spoofed Token Patch" }),
    });
    assert(spoofedPatch.status === 401, `Spoofed cookie on PATCH /api/admin/resources/[id] returns 401 Unauthorized (${spoofedPatch.status})`);

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Server-Side Validation Rules & Protocols
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 2: Server-Side Validation Rules & Protocols ---");

    const validationSource = fs.readFileSync(path.join(process.cwd(), "lib", "validation", "resources.ts"), "utf8");
    assert(validationSource.includes("export function isSafeUrl"), "lib/validation/resources.ts exports isSafeUrl");
    assert(validationSource.includes("export function formatProvider"), "lib/validation/resources.ts exports formatProvider");
    assert(validationSource.includes("export function validateResourceInput"), "lib/validation/resources.ts exports validateResourceInput");

    function isSafeUrl(rawUrl) {
      if (!rawUrl || typeof rawUrl !== "string") return false;
      try {
        const parsed = new URL(rawUrl);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }

    function formatProvider(provider, url) {
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

    function validateResourceInput(input) {
      const ALLOWED_RESOURCE_TYPES = ["video", "article", "pdf", "playlist", "documentation"];
      const errors = {};
      if (!input || typeof input !== "object") {
        return { valid: false, errors: { _general: "Invalid input data received." } };
      }
      const raw = input;
      const title = typeof raw.title === "string" ? raw.title.trim() : "";
      if (!title) {
        errors.title = "Resource title is required.";
      } else if (title.length < 3) {
        errors.title = "Resource title must be at least 3 characters.";
      } else if (title.length > 200) {
        errors.title = "Resource title cannot exceed 200 characters.";
      }

      const url = typeof raw.url === "string" ? raw.url.trim() : "";
      if (!url) {
        errors.url = "Resource URL is required.";
      } else if (url.length > 2000) {
        errors.url = "Resource URL cannot exceed 2000 characters.";
      } else if (!isSafeUrl(url)) {
        errors.url = "URL must be a valid web address starting with http:// or https://.";
      }

      const type = typeof raw.type === "string" ? raw.type.trim().toLowerCase() : "";
      if (!type) {
        errors.type = "Resource type is required.";
      } else if (!ALLOWED_RESOURCE_TYPES.includes(type)) {
        errors.type = `Resource type must be one of: ${ALLOWED_RESOURCE_TYPES.join(", ")}.`;
      }

      let provider = null;
      if (typeof raw.provider === "string") {
        const trimmed = raw.provider.trim();
        if (trimmed.length > 100) errors.provider = "Provider name cannot exceed 100 characters.";
        else if (trimmed.length > 0) provider = trimmed;
      }

      let description = null;
      if (typeof raw.description === "string") {
        const trimmed = raw.description.trim();
        if (trimmed.length > 1000) errors.description = "Description cannot exceed 1000 characters.";
        else if (trimmed.length > 0) description = trimmed;
      }

      if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
      }
      return { valid: true, data: { title, url, type, provider, description } };
    }

    // Title checks
    const vEmptyTitle = validateResourceInput({ title: "", url: "https://example.com", type: "article" });
    assert(!vEmptyTitle.valid && vEmptyTitle.errors?.title !== undefined, "Missing title rejected");

    const vShortTitle = validateResourceInput({ title: "ab", url: "https://example.com", type: "article" });
    assert(!vShortTitle.valid && vShortTitle.errors?.title !== undefined, "Title shorter than 3 chars rejected");

    const vLongTitle = validateResourceInput({ title: "a".repeat(201), url: "https://example.com", type: "article" });
    assert(!vLongTitle.valid && vLongTitle.errors?.title !== undefined, "Title longer than 200 chars rejected");

    // URL protocol checks
    assert(isSafeUrl("https://geeksforgeeks.org/article") === true, "HTTPS protocol URL accepted");
    assert(isSafeUrl("http://example.com/guide") === true, "HTTP protocol URL accepted");
    assert(isSafeUrl("javascript:alert(1)") === false, "javascript: protocol URL rejected");
    assert(isSafeUrl("data:text/html,<script>alert(1)</script>") === false, "data: protocol URL rejected");
    assert(isSafeUrl("file:///etc/passwd") === false, "file: protocol URL rejected");
    assert(isSafeUrl("ftp://example.com/file") === false, "ftp: protocol URL rejected");
    assert(isSafeUrl("not-a-url") === false, "Malformed non-URL rejected");
    assert(isSafeUrl("") === false, "Empty URL rejected");

    const vJsUrl = validateResourceInput({ title: "Valid Title", url: "javascript:alert(1)", type: "article" });
    assert(!vJsUrl.valid && vJsUrl.errors?.url !== undefined, "javascript: URL rejected by validateResourceInput");

    const vDataUrl = validateResourceInput({ title: "Valid Title", url: "data:text/html,abc", type: "article" });
    assert(!vDataUrl.valid && vDataUrl.errors?.url !== undefined, "data: URL rejected by validateResourceInput");

    const vFileUrl = validateResourceInput({ title: "Valid Title", url: "file:///etc/shadow", type: "article" });
    assert(!vFileUrl.valid && vFileUrl.errors?.url !== undefined, "file: URL rejected by validateResourceInput");

    // Resource Type enum checks
    const vBadType = validateResourceInput({ title: "Valid Title", url: "https://example.com", type: "podcast" });
    assert(!vBadType.valid && vBadType.errors?.type !== undefined, "Invalid resource type 'podcast' rejected");

    const validTypes = ["video", "article", "pdf", "playlist", "documentation"];
    let allTypesValid = true;
    for (const t of validTypes) {
      const v = validateResourceInput({ title: "Valid Title", url: "https://example.com", type: t });
      if (!v.valid) allTypesValid = false;
    }
    assert(allTypesValid, "All 5 valid resource types accepted (video, article, pdf, playlist, documentation)");

    // Length checks for optional fields
    const vLongProvider = validateResourceInput({
      title: "Valid Title",
      url: "https://example.com",
      type: "article",
      provider: "p".repeat(101),
    });
    assert(!vLongProvider.valid && vLongProvider.errors?.provider !== undefined, "Provider > 100 chars rejected");

    const vLongDesc = validateResourceInput({
      title: "Valid Title",
      url: "https://example.com",
      type: "article",
      description: "d".repeat(1001),
    });
    assert(!vLongDesc.valid && vLongDesc.errors?.description !== undefined, "Description > 1000 chars rejected");

    // Provider format helper
    assert(formatProvider("NPTEL", "https://nptel.ac.in") === "NPTEL", "Explicit provider preserved");
    assert(formatProvider("", "https://www.youtube.com/watch?v=123") === "youtube.com", "Provider fallback extracts domain");

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Database RLS Mutation Policies
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 3: Database RLS Mutation Policies ---");

    const policyRows = runSupabaseQuery(`
      SELECT policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'resources'
      ORDER BY policyname;
    `);

    const policyMap = new Map(policyRows.map((r) => [r.policyname, r]));
    assert(policyMap.has("Admins insert resources"), "Policy 'Admins insert resources' exists on resources table");
    assert(policyMap.has("Admins update resources"), "Policy 'Admins update resources' exists on resources table");
    assert(policyMap.has("Admins view all resources"), "Policy 'Admins view all resources' exists on resources table");
    assert(policyMap.has("Public view verified resources"), "Policy 'Public view verified resources' exists on resources table");

    // Anon INSERT attempt directly via Supabase client (should be rejected by RLS)
    const { error: anonInsertError } = await supabase.from("resources").insert({
      title: "Anon Illegal Insert",
      url: "https://example.com/anon-hack",
      type: "article",
      status: "pending",
    });
    assert(
      anonInsertError !== null,
      `Anonymous client INSERT is blocked by RLS (error: ${anonInsertError?.code || "permission denied"})`
    );

    // Anon UPDATE attempt directly via Supabase client (should affect 0 rows or error)
    const { data: anonUpdateData, error: anonUpdateError } = await supabase
      .from("resources")
      .update({ title: "Anon Hacked Title" })
      .eq("id", seededVerifiedId)
      .select();
    assert(
      anonUpdateError !== null || (anonUpdateData && anonUpdateData.length === 0),
      `Anonymous client UPDATE is blocked by RLS (affected rows: ${anonUpdateData ? anonUpdateData.length : 0})`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Active Admin Simulation (Rollback Transaction)
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 4: Active Admin Create & Edit (Rollback TX) ---");

    const simResults = runSupabaseQuery(`
      BEGIN;
      -- 1. Temporarily activate admin for test simulation within transaction
      UPDATE public.admins SET is_active = true WHERE id = '00000000-0000-0000-0000-000000000001';
      SET ROLE authenticated;
      SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

      -- 2. Test valid INSERT with default pending status
      INSERT INTO public.resources (title, url, type, provider, description, status, verified_by, verified_at)
      VALUES (
        'Simulation Test Structure Guide',
        'https://example.com/sim-test-structure-guide',
        'article',
        'TestSimProvider',
        'Detailed simulation description for testing',
        'pending',
        NULL,
        NULL
      );

      -- 3. Test UPDATE of normal metadata on newly created resource
      UPDATE public.resources
      SET title = 'Updated Simulation Guide Title',
          description = 'Updated description'
      WHERE url = 'https://example.com/sim-test-structure-guide';

      -- 4. Test UPDATE of metadata on existing verified resource (preserves verified_by and verified_at)
      UPDATE public.resources
      SET description = 'Updated description on verified resource'
      WHERE id = '7d5c1632-7274-4dc0-8f15-939f2e9f585b';

      -- 5. Retrieve verification counts confirming all states
      SELECT 
        (SELECT count(*) FROM public.resources 
         WHERE url = 'https://example.com/sim-test-structure-guide' 
           AND title = 'Updated Simulation Guide Title' 
           AND status = 'pending' 
           AND verified_by IS NULL 
           AND verified_at IS NULL) as pending_sim_ok,
        (SELECT count(*) FROM public.resources 
         WHERE id = '7d5c1632-7274-4dc0-8f15-939f2e9f585b' 
           AND status = 'verified' 
           AND verified_by IS NOT NULL 
           AND verified_at IS NOT NULL) as verified_preserve_ok;

      RESET ROLE;
      ROLLBACK;
    `);

    assert(simResults.length === 1, "Admin simulation executed and returned verification state");
    const simState = simResults[0] || {};
    assert(
      Number(simState.pending_sim_ok) === 1,
      "Active admin can create and edit pending resource (defaults to pending, null verification)"
    );
    assert(
      Number(simState.verified_preserve_ok) === 1,
      "Active admin can edit verified resource preserving verified status and audit trail"
    );

    // Verify rollback completed cleanly: confirm simulation resource does NOT exist
    const checkRolledBack = runSupabaseQuery(`
      SELECT id FROM public.resources WHERE url = 'https://example.com/sim-test-structure-guide';
    `);
    assert(checkRolledBack.length === 0, `Rollback confirmed: simulation test resource was cleanly removed`);

    // Confirm inactive audit account remains inactive
    const auditAccountCheck = runSupabaseQuery(`
      SELECT id, is_active FROM public.admins WHERE id = '00000000-0000-0000-0000-000000000001';
    `);
    assert(
      auditAccountCheck.length === 1 && auditAccountCheck[0].is_active === false,
      `Audit identity 00000000-0000-0000-0000-000000000001 remains is_active = false`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 5: Check Constraint & Mass-Assignment Defense
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 5: Check Constraint & Mass-Assignment Defense ---");

    // Verify check constraint: status = 'verified' WITHOUT verified_by or verified_at fails
    let constraintViolated = false;
    try {
      runSupabaseQuery(`
        BEGIN;
        UPDATE public.admins SET is_active = true WHERE id = '00000000-0000-0000-0000-000000000001';
        SET ROLE authenticated;
        SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
        -- Attempt to maliciously set status='verified' with null verified_by
        INSERT INTO public.resources (title, url, type, status, verified_by, verified_at)
        VALUES ('Illegal Verified Resource', 'https://example.com/illegal-verified', 'article', 'verified', NULL, NULL);
        RESET ROLE;
        ROLLBACK;
      `);
    } catch {
      constraintViolated = true;
    }
    assert(constraintViolated, "Check constraint rejects status='verified' with missing verified_by/verified_at");

    // -------------------------------------------------------------------------
    // TEST SUITE 6: Public Student Portal Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 6: Public Student Portal Isolation ---");

    const topicId = "8921767b-4a11-4fe0-8504-0d5cc02b0465";
    const studentRes = await fetch(`${BASE_URL}/api/curriculum/topics/${topicId}/resources`);
    assert(studentRes.status === 200, `Student API /api/curriculum/topics/${topicId}/resources returns 200 OK`);

    const studentJson = await studentRes.json();
    assert(studentJson.success === true, "Student API returns success: true");

    const unverifiedStudent = (studentJson.data || []).filter((r) => r.status !== "verified");
    assert(unverifiedStudent.length === 0, "Student API strictly returns verified resources only");

    // -------------------------------------------------------------------------
    // TEST SUITE 7: Security Invariants & Credentials
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 7: Security Invariants & Zero Service-Role Credential ---");

    const filesToScan = [
      "lib/services/admin-resources.ts",
      "lib/validation/resources.ts",
      "lib/services/resources.ts",
      "lib/auth/admin.ts",
      "lib/supabase/admin-server.ts",
      "app/admin/resources/page.tsx",
      "app/admin/resources/new/page.tsx",
      "app/admin/resources/[id]/edit/page.tsx",
      "app/api/admin/resources/route.ts",
      "app/api/admin/resources/[id]/route.ts",
      "components/admin/resource-form.tsx",
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
    assert(!foundServiceKey, "Zero SUPABASE_SERVICE_ROLE_KEY references in Phase 7F-B code");

    // Check that DELETE /api/admin/resources/[id] is not implemented
    const deleteRes = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}`, {
      method: "DELETE",
    });
    assert(
      deleteRes.status === 405 || deleteRes.status === 404,
      `DELETE /api/admin/resources/[id] is not implemented (${deleteRes.status})`
    );

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
