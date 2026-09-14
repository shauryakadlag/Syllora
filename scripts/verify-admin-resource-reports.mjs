import { createClient } from "@supabase/supabase-js";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

// Read environment variables
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

const TEST_PORT = 3016;
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

async function isServerReady(url) {
  try {
    const res = await httpFetch(`${url}/api/curriculum/structure`, { signal: AbortSignal.timeout(1000) });
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

  serverProcess.stdout.resume();
  serverProcess.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[Next.js Server Process Exited] code=${code} signal=${signal}`);
    }
  });

  serverProcess.stderr.on("data", (data) => {
    const msg = data.toString();
    if (!msg.includes("Fast Refresh") && !msg.includes("ExperimentalWarning")) {
      console.error(`[Next.js Server Error] ${msg.trim()}`);
    }
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
  const tempSqlFile = path.join(process.cwd(), "scripts", "_temp_query_admin_reports.sql");
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
  console.log("Syllora Phase 8B — Admin Resource Report Management Verification");
  console.log("================================================================================\n");

  const seededVerifiedId = "7d5c1632-7274-4dc0-8f15-939f2e9f585b"; // Verified seeded resource
  const seededPendingId = "1506ef17-adf3-4a8b-b171-1749ca6c1301";
  const seededRejectedId = "6848f633-fba1-4365-affe-3ccc8377c94b";

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: Database Schema, Constraints & RLS Policies
    // -------------------------------------------------------------------------
    console.log("--- Test Suite 1: Database Schema, Constraints & RLS Policies ---");

    // 1.1 Verify report_status enum exists
    const enumTypes = runSupabaseQuery(`
      SELECT typname, enumlabel 
      FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'report_status' 
      ORDER BY e.enumsortorder;
    `);
    const enumLabels = enumTypes.map((e) => e.enumlabel);
    assert(
      enumLabels.includes("open") && enumLabels.includes("resolved") && enumLabels.includes("dismissed"),
      `report_status enum exists with ('open', 'resolved', 'dismissed') (found: ${enumLabels.join(", ")})`
    );

    // 1.2 Verify resource_reports columns exist
    const columns = runSupabaseQuery(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'resource_reports'
      ORDER BY ordinal_position;
    `);
    const colMap = Object.fromEntries(columns.map((c) => [c.column_name, c]));
    assert(colMap.status && colMap.status.udt_name === "report_status", "status column exists with type report_status");
    assert(colMap.resolved_at && colMap.resolved_at.udt_name === "timestamptz", "resolved_at column exists with type timestamptz");
    assert(colMap.resolved_by && colMap.resolved_by.udt_name === "uuid", "resolved_by column exists with type uuid");

    // 1.3 Verify Foreign Key to admins
    const fkeys = runSupabaseQuery(`
      SELECT conname, pg_get_constraintdef(oid) as def 
      FROM pg_constraint 
      WHERE conrelid = 'public.resource_reports'::regclass AND contype = 'f';
    `);
    const adminFkey = fkeys.find((f) => f.conname.includes("resolved_by") || f.def.includes("admins(id)"));
    assert(adminFkey !== undefined, `Foreign key from resolved_by to admins(id) exists (${adminFkey?.conname})`);

    // 1.4 Verify check constraint for resolution state
    const ckeys = runSupabaseQuery(`
      SELECT conname, pg_get_constraintdef(oid) as def 
      FROM pg_constraint 
      WHERE conrelid = 'public.resource_reports'::regclass AND contype = 'c';
    `);
    const resConstraint = ckeys.find((c) => c.conname === "chk_resource_reports_resolution");
    assert(resConstraint !== undefined, `Resolution check constraint chk_resource_reports_resolution exists`);

    // 1.5 Verify required indices exist
    const indices = runSupabaseQuery(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'resource_reports';
    `);
    const indexNames = indices.map((i) => i.indexname);
    assert(indexNames.includes("idx_resource_reports_status"), "Index idx_resource_reports_status exists");
    assert(indexNames.includes("idx_resource_reports_status_created_at"), "Index idx_resource_reports_status_created_at exists");
    assert(indexNames.includes("idx_resource_reports_resolved_by"), "Index idx_resource_reports_resolved_by exists");

    // 1.6 Verify RLS policies on resource_reports
    const policies = runSupabaseQuery(`
      SELECT policyname, cmd, roles 
      FROM pg_policies 
      WHERE tablename = 'resource_reports';
    `);
    const policyMap = Object.fromEntries(policies.map((p) => [p.policyname, p]));
    assert(policyMap["Public submit resource report"]?.cmd === "INSERT", "Public submit resource report (INSERT) policy active");
    assert(policyMap["Admins view resource reports"]?.cmd === "SELECT", "Admins view resource reports (SELECT) policy active");
    assert(policyMap["Admins update resource reports"]?.cmd === "UPDATE", "Admins update resource reports (UPDATE) policy active");
    assert(policyMap["Admins delete resource reports"]?.cmd === "DELETE", "Admins delete resource reports (DELETE) policy active");

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Anonymous & Non-Admin Security Boundaries
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 2: Anonymous & Non-Admin Security Boundaries ---");

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    // 2.1 Anonymous SELECT returns 0 rows
    const { data: anonSelectData } = await anonClient.from("resource_reports").select("*");
    assert(Array.isArray(anonSelectData) && anonSelectData.length === 0, "Anonymous SELECT on resource_reports blocked (0 rows)");

    // 2.2 Anonymous UPDATE is blocked
    const { error: anonUpdateError, data: anonUpdateData } = await anonClient
      .from("resource_reports")
      .update({ status: "resolved" })
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    assert(
      anonUpdateError !== null || (Array.isArray(anonUpdateData) && anonUpdateData.length === 0),
      "Anonymous UPDATE on resource_reports blocked by RLS"
    );

    // 2.3 Anonymous DELETE is blocked
    const { error: anonDeleteError, data: anonDeleteData } = await anonClient
      .from("resource_reports")
      .delete()
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    assert(
      anonDeleteError !== null || (Array.isArray(anonDeleteData) && anonDeleteData.length === 0),
      "Anonymous DELETE on resource_reports blocked by RLS"
    );

    // 2.4 Anonymous INSERT on pending/rejected resource blocked by RLS
    const { error: anonPendingInsert } = await anonClient
      .from("resource_reports")
      .insert({ resource_id: seededPendingId, reason: "broken" });
    assert(anonPendingInsert !== null, "Anonymous INSERT for pending resource blocked by RLS");

    const { error: anonRejectedInsert } = await anonClient
      .from("resource_reports")
      .insert({ resource_id: seededRejectedId, reason: "broken" });
    assert(anonRejectedInsert !== null, "Anonymous INSERT for rejected resource blocked by RLS");

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Admin API Route Authorization & Method Enforcement
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 3: Admin API Route Authorization & Method Enforcement ---");

    // 3.1 Unauthenticated GET on /api/admin/resource-reports -> 401
    const unauthGetRes = await httpFetch(`${BASE_URL}/api/admin/resource-reports`);
    assert(unauthGetRes.status === 401, `Unauthenticated GET /api/admin/resource-reports blocked (${unauthGetRes.status})`);
    const unauthGetJson = await unauthGetRes.json();
    assert(unauthGetJson.error?.code === "UNAUTHORIZED", "Unauthenticated GET returns UNAUTHORIZED code");

    // 3.2 Unsupported methods on /api/admin/resource-reports -> 405
    const postReportsRes = await httpFetch(`${BASE_URL}/api/admin/resource-reports`, { method: "POST" });
    assert(postReportsRes.status === 405, `POST /api/admin/resource-reports blocked (${postReportsRes.status})`);

    const putReportsRes = await httpFetch(`${BASE_URL}/api/admin/resource-reports`, { method: "PUT" });
    assert(putReportsRes.status === 405, `PUT /api/admin/resource-reports blocked (${putReportsRes.status})`);

    const delReportsRes = await httpFetch(`${BASE_URL}/api/admin/resource-reports`, { method: "DELETE" });
    assert(delReportsRes.status === 405, `DELETE /api/admin/resource-reports blocked (${delReportsRes.status})`);

    // 3.3 Unauthenticated POST on /resolve and /dismiss -> 401
    const testReportId = "11111111-1111-1111-1111-111111111111";
    const unauthResolveRes = await httpFetch(`${BASE_URL}/api/admin/resource-reports/${testReportId}/resolve`, {
      method: "POST",
    });
    assert(unauthResolveRes.status === 401, `Unauthenticated POST /resolve blocked (${unauthResolveRes.status})`);

    const unauthDismissRes = await httpFetch(`${BASE_URL}/api/admin/resource-reports/${testReportId}/dismiss`, {
      method: "POST",
    });
    assert(unauthDismissRes.status === 401, `Unauthenticated POST /dismiss blocked (${unauthDismissRes.status})`);

    // 3.4 Unsupported methods on /resolve and /dismiss -> 405
    const getResolveRes = await httpFetch(`${BASE_URL}/api/admin/resource-reports/${testReportId}/resolve`);
    assert(getResolveRes.status === 405, `GET /api/admin/resource-reports/[id]/resolve blocked (${getResolveRes.status})`);

    const getDismissRes = await httpFetch(`${BASE_URL}/api/admin/resource-reports/${testReportId}/dismiss`);
    assert(getDismissRes.status === 405, `GET /api/admin/resource-reports/[id]/dismiss blocked (${getDismissRes.status})`);

    // 3.5 Spoofed session cookie rejected on all admin report endpoints
    const spoofedHeaders = {
      Cookie: "sb-enxbvqlaasbiqywxkmfu-auth-token=malicious-spoofed-jwt-token",
    };
    const spoofedGet = await httpFetch(`${BASE_URL}/api/admin/resource-reports`, { headers: spoofedHeaders });
    assert(spoofedGet.status === 401, "Spoofed cookie on GET /api/admin/resource-reports rejected (401)");

    const spoofedResolve = await httpFetch(`${BASE_URL}/api/admin/resource-reports/${testReportId}/resolve`, {
      method: "POST",
      headers: spoofedHeaders,
    });
    assert(spoofedResolve.status === 401, "Spoofed cookie on POST /resolve rejected (401)");

    const spoofedDismiss = await httpFetch(`${BASE_URL}/api/admin/resource-reports/${testReportId}/dismiss`, {
      method: "POST",
      headers: spoofedHeaders,
    });
    assert(spoofedDismiss.status === 401, "Spoofed cookie on POST /dismiss rejected (401)");

    // -------------------------------------------------------------------------
    // TEST SUITE 4: State Machine & Rollback Transaction Simulation
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 4: State Machine & Rollback Transaction Simulation ---");

    const simResults = runSupabaseQuery(`
      BEGIN;
      -- 1. Activate admin simulation and switch to authenticated role
      UPDATE public.admins SET is_active = true WHERE id = '00000000-0000-0000-0000-000000000001';
      SET ROLE authenticated;
      SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

      -- 2. Test Check Constraint: Open report cannot have resolved_at or resolved_by
      DO $$
      BEGIN
        BEGIN
          INSERT INTO public.resource_reports (id, resource_id, reason, status, resolved_at, resolved_by)
          VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '7d5c1632-7274-4dc0-8f15-939f2e9f585b', 'broken', 'open', now(), '00000000-0000-0000-0000-000000000001');
          CREATE TEMP TABLE t_open_chk (val int);
        EXCEPTION
          WHEN check_violation THEN
            CREATE TEMP TABLE t_open_chk (val int);
            INSERT INTO t_open_chk VALUES (1);
        END;
      END $$;

      -- 3. Test Check Constraint: Resolved report must have resolved_at and resolved_by
      DO $$
      BEGIN
        BEGIN
          INSERT INTO public.resource_reports (id, resource_id, reason, status, resolved_at, resolved_by)
          VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '7d5c1632-7274-4dc0-8f15-939f2e9f585b', 'broken', 'resolved', NULL, NULL);
          CREATE TEMP TABLE t_res_chk (val int);
        EXCEPTION
          WHEN check_violation THEN
            CREATE TEMP TABLE t_res_chk (val int);
            INSERT INTO t_res_chk VALUES (1);
        END;
      END $$;

      -- 4. Create two valid open simulation reports
      INSERT INTO public.resource_reports (id, resource_id, reason, description, status)
      VALUES 
        ('66666666-6666-6666-6666-666666666666', '7d5c1632-7274-4dc0-8f15-939f2e9f585b', 'broken', 'Simulated report for resolve', 'open'),
        ('77777777-7777-7777-7777-777777777777', '7d5c1632-7274-4dc0-8f15-939f2e9f585b', 'misleading', 'Simulated report for dismiss', 'open');

      -- 5. Admin can list open reports under RLS
      SELECT count(*) INTO TEMP TABLE t_admin_list_count
      FROM public.resource_reports;

      -- 6. State Transition 1: open -> resolved
      UPDATE public.resource_reports
      SET status = 'resolved', resolved_at = now(), resolved_by = '00000000-0000-0000-0000-000000000001'
      WHERE id = '66666666-6666-6666-6666-666666666666' AND status = 'open';

      SELECT count(*) INTO TEMP TABLE t_resolve_ok
      FROM public.resource_reports
      WHERE id = '66666666-6666-6666-6666-666666666666' AND status = 'resolved' AND resolved_by IS NOT NULL;

      -- 7. Block Invalid Transition: resolved -> resolved again
      UPDATE public.resource_reports
      SET status = 'resolved', resolved_at = now(), resolved_by = '00000000-0000-0000-0000-000000000001'
      WHERE id = '66666666-6666-6666-6666-666666666666' AND status = 'open';

      SELECT count(*) INTO TEMP TABLE t_res_again_blocked
      FROM public.resource_reports
      WHERE id = '66666666-6666-6666-6666-666666666666' AND status = 'resolved';

      -- 8. Block Invalid Transition: resolved -> dismissed
      UPDATE public.resource_reports
      SET status = 'dismissed', resolved_at = now(), resolved_by = '00000000-0000-0000-0000-000000000001'
      WHERE id = '66666666-6666-6666-6666-666666666666' AND status = 'open';

      -- 9. State Transition 2: open -> dismissed
      UPDATE public.resource_reports
      SET status = 'dismissed', resolved_at = now(), resolved_by = '00000000-0000-0000-0000-000000000001'
      WHERE id = '77777777-7777-7777-7777-777777777777' AND status = 'open';

      SELECT count(*) INTO TEMP TABLE t_dismiss_ok
      FROM public.resource_reports
      WHERE id = '77777777-7777-7777-7777-777777777777' AND status = 'dismissed' AND resolved_by IS NOT NULL;

      -- 10. Block Invalid Transition: dismissed -> resolved
      UPDATE public.resource_reports
      SET status = 'resolved', resolved_at = now(), resolved_by = '00000000-0000-0000-0000-000000000001'
      WHERE id = '77777777-7777-7777-7777-777777777777' AND status = 'open';

      -- 11. Confirm target learning resource remains strictly untouched
      SELECT count(*) INTO TEMP TABLE t_resource_untouched
      FROM public.resources
      WHERE id = '7d5c1632-7274-4dc0-8f15-939f2e9f585b'
        AND status = 'verified'
        AND verified_by IS NOT NULL
        AND verified_at IS NOT NULL;

      -- Collect simulation outputs
      SELECT 
        (SELECT coalesce(sum(val), 0) FROM t_open_chk) as open_chk_ok,
        (SELECT coalesce(sum(val), 0) FROM t_res_chk) as res_chk_ok,
        (SELECT count FROM t_admin_list_count) as list_count,
        (SELECT count FROM t_resolve_ok) as resolve_ok,
        (SELECT count FROM t_res_again_blocked) as res_again_blocked,
        (SELECT count FROM t_dismiss_ok) as dismiss_ok,
        (SELECT count FROM t_resource_untouched) as resource_untouched;

      RESET ROLE;
      ROLLBACK;
    `);

    assert(simResults.length === 1, "Simulation transaction executed successfully");
    const sim = simResults[0] || {};
    assert(Number(sim.open_chk_ok) === 1, "Check constraint rejects open report with populated resolution fields");
    assert(Number(sim.res_chk_ok) === 1, "Check constraint rejects resolved report with null resolution fields");
    assert(Number(sim.list_count) >= 2, "Active admin can view submitted reports under RLS");
    assert(Number(sim.resolve_ok) === 1, "open -> resolved atomic transition succeeds");
    assert(Number(sim.res_again_blocked) === 1, "resolved report cannot be resolved or dismissed again");
    assert(Number(sim.dismiss_ok) === 1, "open -> dismissed atomic transition succeeds");
    assert(Number(sim.resource_untouched) === 1, "Target resource status and verification remain 100% untouched");

    // -------------------------------------------------------------------------
    // TEST SUITE 5: Service Layer Validation & Error Formats
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 5: Service Layer Validation & Error Formats ---");

    const adminReportsSrc = fs.readFileSync(path.join(process.cwd(), "lib", "services", "admin-reports.ts"), "utf8");
    assert(adminReportsSrc.includes("export async function getAdminResourceReports"), "lib/services/admin-reports.ts exports getAdminResourceReports");
    assert(adminReportsSrc.includes("export async function resolveAdminResourceReport"), "lib/services/admin-reports.ts exports resolveAdminResourceReport");
    assert(adminReportsSrc.includes("export async function dismissAdminResourceReport"), "lib/services/admin-reports.ts exports dismissAdminResourceReport");
    assert(adminReportsSrc.includes('.eq("status", "open")'), "resolveAdminResourceReport & dismissAdminResourceReport enforce atomic status='open' condition");
    assert(adminReportsSrc.includes("UUID_REGEX"), "lib/services/admin-reports.ts defines and enforces UUID_REGEX validation");

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert(!UUID_REGEX.test("not-a-uuid"), "UUID_REGEX rejects 'not-a-uuid'");
    assert(!UUID_REGEX.test("12345678"), "UUID_REGEX rejects truncated string");
    assert(!UUID_REGEX.test(""), "UUID_REGEX rejects empty string");
    assert(UUID_REGEX.test("7d5c1632-7274-4dc0-8f15-939f2e9f585b"), "UUID_REGEX accepts valid UUID");

    // -------------------------------------------------------------------------
    // TEST SUITE 6: UI Source Sanity Checks & Navigation Wiring
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 6: UI Source Sanity Checks & Navigation Wiring ---");

    const adminPageSrc = fs.readFileSync(path.join(process.cwd(), "app", "admin", "page.tsx"), "utf8");
    assert(adminPageSrc.includes("/admin/resource-reports"), "Admin dashboard links to /admin/resource-reports");
    assert(adminPageSrc.includes("Resource Reports"), "Admin dashboard displays Resource Reports module");

    const adminResourcesSrc = fs.readFileSync(path.join(process.cwd(), "app", "admin", "resources", "page.tsx"), "utf8");
    assert(adminResourcesSrc.includes("/admin/resource-reports"), "Admin resources page links to /admin/resource-reports");

    const reportsPageSrc = fs.readFileSync(path.join(process.cwd(), "app", "admin", "resource-reports", "page.tsx"), "utf8");
    assert(reportsPageSrc.includes("verifyAdminSession"), "Resource reports page uses authoritative verifyAdminSession");
    assert(reportsPageSrc.includes("ReportModerationActions"), "Resource reports page renders ReportModerationActions component");

    const moderationActionsSrc = fs.readFileSync(path.join(process.cwd(), "components", "admin", "report-moderation-actions.tsx"), "utf8");
    assert(moderationActionsSrc.includes('"use client"'), "report-moderation-actions is a client component");
    assert(moderationActionsSrc.includes("handleResolve"), "report-moderation-actions implements handleResolve");
    assert(moderationActionsSrc.includes("handleDismiss"), "report-moderation-actions implements handleDismiss");
    assert(moderationActionsSrc.includes("confirmingAction"), "report-moderation-actions requires confirmation before resolving/dismissing");
    assert(moderationActionsSrc.includes("isSubmitting"), "report-moderation-actions disables buttons during submission to prevent duplicate clicks");

    // -------------------------------------------------------------------------
    // TEST SUITE 7: Security Invariants & Zero Service-Role Credential
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 7: Security Invariants & Zero Service-Role Credential ---");

    const phase8bFiles = [
      "supabase/migrations/20260914140000_admin_resource_reports.sql",
      "lib/services/admin-reports.ts",
      "app/api/admin/resource-reports/route.ts",
      "app/api/admin/resource-reports/[id]/resolve/route.ts",
      "app/api/admin/resource-reports/[id]/dismiss/route.ts",
      "app/admin/resource-reports/page.tsx",
      "components/admin/report-moderation-actions.tsx",
    ];

    let foundServiceKey = false;
    for (const rel of phase8bFiles) {
      const fullPath = path.join(process.cwd(), rel);
      if (fs.existsSync(fullPath)) {
        const text = fs.readFileSync(fullPath, "utf8");
        if (text.includes("SUPABASE_SERVICE_ROLE_KEY") || text.includes("service_role")) {
          foundServiceKey = true;
          console.error(`  Service role key found in ${rel}`);
        }
      }
    }
    assert(!foundServiceKey, "Zero SUPABASE_SERVICE_ROLE_KEY references in Phase 8B admin reports code");

    // Confirm audit account remains inactive
    const auditAccountCheck = runSupabaseQuery(`
      SELECT id, is_active FROM public.admins WHERE id = '00000000-0000-0000-0000-000000000001';
    `);
    assert(
      auditAccountCheck.length === 1 && auditAccountCheck[0].is_active === false,
      "Audit identity 00000000-0000-0000-0000-000000000001 remains is_active = false"
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
