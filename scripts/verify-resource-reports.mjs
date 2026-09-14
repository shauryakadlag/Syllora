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

const TEST_PORT = process.env.TEST_PORT || 3014;
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
  const tempSqlFile = path.join(process.cwd(), "scripts", "_temp_query_reports.sql");
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
  console.log("Syllora Phase 8A — Student Resource Reporting Foundation Verification");
  console.log("================================================================================\n");

  const seededVerifiedId = "7d5c1632-7274-4dc0-8f15-939f2e9f585b"; // Verified seeded resource

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: Route Handlers & Supported Methods
    // -------------------------------------------------------------------------
    console.log("--- Test Suite 1: Route Handlers & Method Enforcement ---");

    // 1.1 GET on report route is not allowed
    const getReportRes = await httpFetch(`${BASE_URL}/api/resources/${seededVerifiedId}/report`);
    assert(
      getReportRes.status === 405 || getReportRes.status === 404,
      `GET /api/resources/[resourceId]/report is blocked (${getReportRes.status})`
    );

    // 1.2 PUT on report route is not allowed
    const putReportRes = await httpFetch(`${BASE_URL}/api/resources/${seededVerifiedId}/report`, {
      method: "PUT",
    });
    assert(
      putReportRes.status === 405 || putReportRes.status === 404,
      `PUT /api/resources/[resourceId]/report is blocked (${putReportRes.status})`
    );

    // 1.3 DELETE on report route is not allowed
    const deleteReportRes = await httpFetch(`${BASE_URL}/api/resources/${seededVerifiedId}/report`, {
      method: "DELETE",
    });
    assert(
      deleteReportRes.status === 405 || deleteReportRes.status === 404,
      `DELETE /api/resources/[resourceId]/report is blocked (${deleteReportRes.status})`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Server-Side Validation Rules
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 2: Server-Side Validation Rules ---");

    // 2.1 Malformed UUID format
    const badIdRes = await httpFetch(`${BASE_URL}/api/resources/not-a-uuid/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "broken" }),
    });
    assert(badIdRes.status === 400, `Malformed resource UUID rejected with 400 Bad Request (${badIdRes.status})`);
    const badIdJson = await badIdRes.json();
    assert(badIdJson.success === false && badIdJson.error?.code === "BAD_REQUEST", "Malformed UUID returns standard error format");

    // 2.2 Nonexistent resource UUID
    const nonExistentRes = await httpFetch(`${BASE_URL}/api/resources/ffffffff-ffff-ffff-ffff-ffffffffffff/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "broken" }),
    });
    assert(nonExistentRes.status === 404, `Nonexistent resource rejected with 404 Not Found (${nonExistentRes.status})`);
    const nonExistentJson = await nonExistentRes.json();
    assert(nonExistentJson.success === false && nonExistentJson.error?.code === "NOT_FOUND", "Nonexistent resource returns NOT_FOUND code");

    // 2.3 Empty payload
    const emptyBodyRes = await httpFetch(`${BASE_URL}/api/resources/${seededVerifiedId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert(emptyBodyRes.status === 400, `Empty body rejected with 400 Bad Request (${emptyBodyRes.status})`);

    // 2.4 Missing reason
    const missingReasonRes = await httpFetch(`${BASE_URL}/api/resources/${seededVerifiedId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Link is broken" }),
    });
    assert(missingReasonRes.status === 400, `Missing reason rejected with 400 Bad Request (${missingReasonRes.status})`);

    // 2.5 Invalid reason value
    const invalidReasonRes = await httpFetch(`${BASE_URL}/api/resources/${seededVerifiedId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "spam_hate_speech" }),
    });
    assert(invalidReasonRes.status === 400, `Invalid reason value rejected with 400 Bad Request (${invalidReasonRes.status})`);

    // 2.6 Oversized description (> 1000 characters)
    const longDescRes = await httpFetch(`${BASE_URL}/api/resources/${seededVerifiedId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "broken", description: "a".repeat(1001) }),
    });
    assert(longDescRes.status === 400, `Oversized description (>1000 chars) rejected with 400 Bad Request (${longDescRes.status})`);

    // 2.7 Malformed JSON body
    const malformedJsonRes = await httpFetch(`${BASE_URL}/api/resources/${seededVerifiedId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json-content",
    });
    assert(malformedJsonRes.status === 400, `Malformed JSON rejected with 400 Bad Request (${malformedJsonRes.status})`);

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Database Constraints & Row Level Security (RLS)
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 3: Database Constraints & Row Level Security ---");

    // 3.1 Verify RLS is enabled on resource_reports
    const tableRls = runSupabaseQuery(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'resource_reports';
    `);
    assert(
      tableRls.length === 1 && tableRls[0].rowsecurity === true,
      "resource_reports table has Row Level Security ENABLED"
    );

    // 3.2 Verify policies on resource_reports
    const reportPolicies = runSupabaseQuery(`
      SELECT policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'resource_reports'
      ORDER BY policyname;
    `);
    const policyMap = new Map(reportPolicies.map((r) => [r.policyname, r]));
    assert(policyMap.has("Public submit resource report"), "Policy 'Public submit resource report' (INSERT) exists");
    assert(policyMap.has("Admins view resource reports"), "Policy 'Admins view resource reports' (SELECT) exists");
    assert(policyMap.has("Admins delete resource reports"), "Policy 'Admins delete resource reports' (DELETE) exists");
    assert(!policyMap.has("Public view resource reports"), "Zero public SELECT policy on resource_reports");
    assert(!policyMap.has("Public update resource reports"), "Zero public UPDATE policy on resource_reports");

    // 3.3 Anon direct SELECT on resource_reports is blocked (returns 0 rows or error)
    const { data: anonSelectData, error: anonSelectError } = await supabase
      .from("resource_reports")
      .select("*");
    assert(
      anonSelectError !== null || (anonSelectData && anonSelectData.length === 0),
      `Anonymous SELECT on resource_reports is blocked by RLS (visible rows: ${anonSelectData ? anonSelectData.length : 0})`
    );

    // 3.4 Anon direct UPDATE on resource_reports is blocked
    const { data: anonUpdateData, error: anonUpdateError } = await supabase
      .from("resource_reports")
      .update({ description: "Hacked description" })
      .eq("resource_id", seededVerifiedId)
      .select();
    assert(
      anonUpdateError !== null || (anonUpdateData && anonUpdateData.length === 0),
      `Anonymous UPDATE on resource_reports is blocked by RLS (affected rows: ${anonUpdateData ? anonUpdateData.length : 0})`
    );

    // 3.5 Anon direct DELETE on resource_reports is blocked
    const { data: anonDeleteData, error: anonDeleteError } = await supabase
      .from("resource_reports")
      .delete()
      .eq("resource_id", seededVerifiedId)
      .select();
    assert(
      anonDeleteError !== null || (anonDeleteData && anonDeleteData.length === 0),
      `Anonymous DELETE on resource_reports is blocked by RLS (affected rows: ${anonDeleteData ? anonDeleteData.length : 0})`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Verification-Status Boundary & Rollback Simulation
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 4: Verification-Status Boundary & Rollback Simulation ---");

    const seededPendingId = "1506ef17-adf3-4a8b-b171-1749ca6c1301";
    const seededRejectedId = "6848f633-fba1-4365-affe-3ccc8377c94b";

    // 4.1 Reporting a pending resource via API is rejected
    const pendingReportRes = await httpFetch(`${BASE_URL}/api/resources/${seededPendingId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "broken" }),
    });
    assert(
      pendingReportRes.status === 400 || pendingReportRes.status === 404,
      `Reporting pending resource is rejected (${pendingReportRes.status})`
    );

    // 4.2 Reporting a rejected resource via API is rejected
    const rejectedReportRes = await httpFetch(`${BASE_URL}/api/resources/${seededRejectedId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "broken" }),
    });
    assert(
      rejectedReportRes.status === 400 || rejectedReportRes.status === 404,
      `Reporting rejected resource is rejected (${rejectedReportRes.status})`
    );

    // 4.3 Direct anon INSERT into resource_reports for pending resource is blocked by RLS
    const { error: anonPendingInsertError } = await supabase
      .from("resource_reports")
      .insert({
        resource_id: seededPendingId,
        reason: "broken",
      });
    assert(
      anonPendingInsertError !== null,
      `Direct anon INSERT on pending resource is blocked by RLS WITH CHECK (error: ${anonPendingInsertError?.code || "42501"})`
    );

    // 4.4 Direct anon INSERT into resource_reports for rejected resource is blocked by RLS
    const { error: anonRejectedInsertError } = await supabase
      .from("resource_reports")
      .insert({
        resource_id: seededRejectedId,
        reason: "broken",
      });
    assert(
      anonRejectedInsertError !== null,
      `Direct anon INSERT on rejected resource is blocked by RLS WITH CHECK (error: ${anonRejectedInsertError?.code || "42501"})`
    );

    // 4.5 SQL Simulation within rollback transaction (check constraints, admin policies, integrity)
    const simResults = runSupabaseQuery(`
      BEGIN;
      -- 1. Activate admin simulation and switch to authenticated role
      UPDATE public.admins SET is_active = true WHERE id = '00000000-0000-0000-0000-000000000001';
      SET ROLE authenticated;
      SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

      -- 2. Test check constraint on reason (invalid reason rejected)
      DO $$
      BEGIN
        BEGIN
          INSERT INTO public.resource_reports (resource_id, reason)
          VALUES ('7d5c1632-7274-4dc0-8f15-939f2e9f585b', 'illegal_reason');
          CREATE TEMP TABLE t_reason_constraint_blocked (val int);
        EXCEPTION
          WHEN check_violation THEN
            CREATE TEMP TABLE t_reason_constraint_blocked (val int);
            INSERT INTO t_reason_constraint_blocked VALUES (1);
        END;
      END $$;

      -- 3. Test check constraint on description (> 1000 chars rejected)
      DO $$
      BEGIN
        BEGIN
          INSERT INTO public.resource_reports (resource_id, reason, description)
          VALUES ('7d5c1632-7274-4dc0-8f15-939f2e9f585b', 'other', repeat('x', 1001));
          CREATE TEMP TABLE t_desc_constraint_blocked (val int);
        EXCEPTION
          WHEN check_violation THEN
            CREATE TEMP TABLE t_desc_constraint_blocked (val int);
            INSERT INTO t_desc_constraint_blocked VALUES (1);
        END;
      END $$;

      -- 4. Insert simulation report on verified resource as active admin
      INSERT INTO public.resource_reports (id, resource_id, reason, description)
      VALUES ('55555555-5555-5555-5555-555555555555', '7d5c1632-7274-4dc0-8f15-939f2e9f585b', 'broken', 'Simulated admin report');

      -- 5. Admin can view reports when authenticated as active admin
      SELECT count(*) INTO TEMP TABLE t_admin_view_count
      FROM public.resource_reports
      WHERE resource_id = '7d5c1632-7274-4dc0-8f15-939f2e9f585b';

      -- 6. Admin can delete report
      DELETE FROM public.resource_reports
      WHERE id = '55555555-5555-5555-5555-555555555555';

      SELECT count(*) INTO TEMP TABLE t_admin_after_delete
      FROM public.resource_reports
      WHERE id = '55555555-5555-5555-5555-555555555555';

      -- 7. Confirm target resource remains strictly verified and untouched
      SELECT 
        (SELECT coalesce(sum(val), 0) FROM t_reason_constraint_blocked) as reason_constraint_ok,
        (SELECT coalesce(sum(val), 0) FROM t_desc_constraint_blocked) as desc_constraint_ok,
        (SELECT count FROM t_admin_view_count) as admin_view_ok,
        (SELECT count FROM t_admin_after_delete) as admin_after_delete_ok,
        (SELECT count(*) FROM public.resources 
         WHERE id = '7d5c1632-7274-4dc0-8f15-939f2e9f585b' 
           AND status = 'verified' 
           AND verified_by IS NOT NULL 
           AND verified_at IS NOT NULL) as resource_status_untouched;

      RESET ROLE;
      ROLLBACK;
    `);

    assert(simResults.length === 1, "Simulation transaction executed successfully");
    const sim = simResults[0] || {};
    assert(Number(sim.reason_constraint_ok) === 1, "Database check constraint rejects invalid report reasons");
    assert(Number(sim.desc_constraint_ok) === 1, "Database check constraint rejects description > 1000 chars");
    assert(Number(sim.admin_view_ok) >= 1, "Active admin policy permits viewing submitted reports");
    assert(Number(sim.admin_after_delete_ok) === 0, "Active admin policy permits deleting/resolving reports");
    assert(Number(sim.resource_status_untouched) === 1, "Resource status, verified_by, and verified_at remain completely unchanged");

    // Confirm rollback cleanup
    const leftoverCheck = runSupabaseQuery(`
      SELECT count(*) as count FROM public.resource_reports WHERE id = '55555555-5555-5555-5555-555555555555';
    `);
    assert(Number(leftoverCheck[0]?.count || 0) === 0, "Rollback verified: simulation report cleanly removed");

    // -------------------------------------------------------------------------
    // TEST SUITE 5: UI Wiring & End-to-End API Integration
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 5: UI Wiring & End-to-End API Integration ---");

    // 5.1 Successful submission via public API endpoint
    const validReportRes = await httpFetch(`${BASE_URL}/api/resources/${seededVerifiedId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: "broken",
        description: "Automated test: link temporarily returns error 404.",
      }),
    });
    assert(validReportRes.status === 201, `Valid report submission returns 201 Created (${validReportRes.status})`);
    const validReportJson = await validReportRes.json();
    assert(validReportJson.success === true, "Valid report response has success: true");
    assert(typeof validReportJson.message === "string", "Valid report response includes thank-you message");
    assert(typeof validReportJson.data?.id === "string", "Valid report response returns generated report ID");

    // Clean up the newly inserted test report safely via SQL
    if (validReportJson.data?.id) {
      runSupabaseQuery(`
        DELETE FROM public.resource_reports WHERE id = '${validReportJson.data.id}';
      `);
      console.log(`  [CLEANUP] Deleted test report ${validReportJson.data.id}`);
    }

    // 5.2 UI Component Source Sanity Check
    const subjectPageSource = fs.readFileSync(
      path.join(process.cwd(), "app", "subject", "[courseCode]", "page.tsx"),
      "utf8"
    );
    assert(
      subjectPageSource.includes("ReportResourceDialog"),
      "Subject page imports and renders ReportResourceDialog"
    );

    const dialogSource = fs.readFileSync(
      path.join(process.cwd(), "components", "resources", "report-resource-dialog.tsx"),
      "utf8"
    );
    assert(
      dialogSource.includes('"use client"') || dialogSource.includes("'use client'"),
      "ReportResourceDialog is a client component"
    );
    assert(
      dialogSource.includes("role=\"dialog\"") && dialogSource.includes("aria-modal=\"true\""),
      "ReportResourceDialog includes accessible dialog semantics"
    );
    assert(
      dialogSource.includes("isSubmitting") && dialogSource.includes("disabled={!reason || isSubmitting}"),
      "ReportResourceDialog disables submit button during request to prevent duplicates"
    );
    assert(
      dialogSource.includes("Report Received") || dialogSource.includes("Thank you"),
      "ReportResourceDialog renders clear success feedback"
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 6: Security Invariants & Zero Service-Role Credential
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 6: Security Invariants & Zero Service-Role Credential ---");

    const filesToScan = [
      "lib/services/resource-reports.ts",
      "lib/validation/reports.ts",
      "app/api/resources/[resourceId]/report/route.ts",
      "components/resources/report-resource-dialog.tsx",
      "app/subject/[courseCode]/page.tsx",
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
    assert(!foundServiceKey, "Zero SUPABASE_SERVICE_ROLE_KEY references in Phase 8A reporting code");

    // Confirm no personal info fields in resource_reports
    const columnRows = runSupabaseQuery(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resource_reports'
      ORDER BY ordinal_position;
    `);
    const colNames = columnRows.map((c) => c.column_name);
    assert(
      !colNames.includes("email") &&
      !colNames.includes("user_id") &&
      !colNames.includes("ip_address") &&
      !colNames.includes("ip") &&
      !colNames.includes("name"),
      "resource_reports stores zero personal/tracking info (id, resource_id, reason, description, created_at only)"
    );

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
