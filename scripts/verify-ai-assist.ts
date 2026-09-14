import { createClient } from "@supabase/supabase-js";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  validateAIAssistInput,
  loadTopicCurriculumContext,
  buildPrompts,
  generateAIAssistance,
} from "../lib/services/ai-assist";

// 1. Read environment variables from .env.local
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

// Populate process.env for service functions
process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;

const TEST_PORT = 3022;
const BASE_URL = `http://localhost:${TEST_PORT}`;
let serverProcess: any = null;

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

async function httpFetch(url: string, options: any = {}) {
  const headers = { ...options.headers, Connection: "close" };
  try {
    return await fetch(url, { ...options, headers });
  } catch (err: any) {
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

  return new Promise<void>((resolve, reject) => {
    serverProcess.stdout.on("data", (data: any) => {
      const msg = data.toString();
      if (msg.includes("Ready in") || msg.includes("started server") || msg.includes("http://localhost:")) {
        if (!started) {
          started = true;
          console.log("Test server is ready.");
          resolve();
        }
      }
    });

    serverProcess.stderr.on("data", () => {
      // ignore normal stderr logs
    });

    serverProcess.on("error", (err: any) => {
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

function runSupabaseQuery(sql: string) {
  const tempSqlFile = path.join(process.cwd(), "scripts", "_temp_query_ai_assist.sql");
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

function assert(condition: boolean, message: string) {
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
  console.log("SYLLORA PHASE 9A - AI LEARNING ASSISTANCE MVP VERIFICATION");
  console.log("================================================================================");

  // ---------------------------------------------------------------------------
  // TEST GROUP 1: Security, Secrets & Architecture Isolation
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 1: Security, Secrets & Architecture Isolation ---");

  // 1.1 Inactive audit account remains inactive
  const auditAccountCheck = runSupabaseQuery(`
    SELECT id, is_active FROM public.admins WHERE id = '00000000-0000-0000-0000-000000000001';
  `);
  assert(
    auditAccountCheck.length === 1 && auditAccountCheck[0].is_active === false,
    "Audit identity 00000000-0000-0000-0000-000000000001 remains is_active = false"
  );

  // 1.2 Zero service-role keys in new files
  const filesToCheck = [
    "lib/services/ai-assist.ts",
    "app/api/ai/assist/route.ts",
    "components/ai/topic-ai-assist-dialog.tsx",
  ];

  for (const f of filesToCheck) {
    const fullPath = path.join(process.cwd(), f);
    assert(fs.existsSync(fullPath), `File exists: ${f}`);
    const content = fs.readFileSync(fullPath, "utf8");
    assert(!content.includes("service_role") && !content.includes("SUPABASE_SERVICE_ROLE_KEY"), `${f} contains zero service-role references`);
    assert(!content.includes("AIzaSy"), `${f} does not hardcode any Google API keys`);
  }

  // 1.3 Verify GEMINI_API_KEY is not exposed to client bundle
  const clientComponentPath = path.join(process.cwd(), "components/ai/topic-ai-assist-dialog.tsx");
  const clientComponentContent = fs.readFileSync(clientComponentPath, "utf8");
  assert(
    !clientComponentContent.includes("GEMINI_API_KEY"),
    "Client dialog component contains no references to GEMINI_API_KEY"
  );
  assert(
    !clientComponentContent.includes("process.env"),
    "Client dialog component contains no server process.env access"
  );

  // 1.4 Verify .env.example contains GEMINI_API_KEY placeholder
  const envExamplePath = path.join(process.cwd(), ".env.example");
  const envExampleContent = fs.readFileSync(envExamplePath, "utf8");
  assert(
    envExampleContent.includes("GEMINI_API_KEY="),
    ".env.example includes GEMINI_API_KEY entry under server-side secrets"
  );

  // 1.5 Curriculum baseline check
  const topicCountBefore = runSupabaseQuery(`SELECT count(*) FROM public.learning_topics;`);
  const resourceCountBefore = runSupabaseQuery(`SELECT count(*) FROM public.resources;`);
  assert(topicCountBefore.length > 0 && resourceCountBefore.length > 0, "Curriculum table rows queried successfully");

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: Unauthenticated HTTP API Access & CSRF Defense
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: Unauthenticated HTTP API Access & CSRF Defense ---");

  // 2.1 Unauthenticated POST -> 401
  const unauthRes = await httpFetch(`${BASE_URL}/api/ai/assist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topicId: "00000000-0000-0000-0000-000000000001",
      mode: "explain",
    }),
  });
  assert(unauthRes.status === 401, "POST /api/ai/assist without authentication returns 401 Unauthorized");
  const unauthJson = await unauthRes.json();
  assert(unauthJson.error?.code === "UNAUTHORIZED", "Error code is UNAUTHORIZED");
  assert(!unauthJson.success, "Success flag is false on unauthenticated call");

  // 2.2 GET method not allowed -> 405
  const getRes = await httpFetch(`${BASE_URL}/api/ai/assist`);
  assert(getRes.status === 405, "GET /api/ai/assist returns 405 Method Not Allowed");

  // 2.3 CSRF rejection on mismatched origin -> 403
  const csrfRes = await httpFetch(`${BASE_URL}/api/ai/assist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://attacker.evil.com",
      host: `localhost:${TEST_PORT}`,
    },
    body: JSON.stringify({
      topicId: "00000000-0000-0000-0000-000000000001",
      mode: "explain",
    }),
  });
  assert(csrfRes.status === 403, "POST /api/ai/assist with mismatched origin returns 403 Forbidden");
  const csrfJson = await csrfRes.json();
  assert(csrfJson.error?.code === "FORBIDDEN", "CSRF error code is FORBIDDEN");

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Service-Level Input Validation
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: Service-Level Input Validation ---");

  // 3.1 Null / undefined / empty input
  assert(validateAIAssistInput(null).valid === false, "Null input rejected as invalid");
  assert(validateAIAssistInput({}).valid === false, "Empty object rejected as invalid");

  // 3.2 Non-UUID topicId
  const badUuidResult = validateAIAssistInput({ topicId: "not-a-uuid", mode: "explain" });
  assert(badUuidResult.valid === false, "Non-UUID topicId rejected");

  // 3.3 Unsupported modes (reject arbitrary chat or injection tokens)
  const badMode1 = validateAIAssistInput({ topicId: "00000000-0000-0000-0000-000000000001", mode: "chat" });
  assert(badMode1.valid === false, "Mode 'chat' rejected");

  const badMode2 = validateAIAssistInput({ topicId: "00000000-0000-0000-0000-000000000001", mode: "generate_syllabus" });
  assert(badMode2.valid === false, "Mode 'generate_syllabus' rejected");

  const badMode3 = validateAIAssistInput({ topicId: "00000000-0000-0000-0000-000000000001", mode: "" });
  assert(badMode3.valid === false, "Empty mode rejected");

  // 3.4 Valid inputs for all 3 modes
  for (const m of ["explain", "example", "quiz"] as const) {
    const validRes = validateAIAssistInput({ topicId: "00000000-0000-0000-0000-000000000001", mode: m });
    assert(validRes.valid === true && validRes.data?.mode === m, `Valid input accepted for mode: ${m}`);
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Curriculum Grounding & Context Fetching
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: Curriculum Grounding & Context Fetching ---");

  // 4.1 Non-existent topic UUID
  const notFoundContext = await loadTopicCurriculumContext("00000000-0000-0000-0000-000000000099");
  assert(notFoundContext.error === "NOT_FOUND", "Non-existent topic returns error NOT_FOUND");

  // 4.2 Real published learning topic from database
  const publishedTopics = runSupabaseQuery(`
    SELECT id, normalized_title, status
    FROM public.learning_topics
    WHERE status = 'published'
    LIMIT 1;
  `);
  assert(publishedTopics.length === 1, `Found real published topic: "${publishedTopics[0]?.normalized_title}"`);
  const realTopic = publishedTopics[0];

  const realContext = await loadTopicCurriculumContext(realTopic.id);
  assert(!realContext.error && !!realContext.context, "Curriculum context fetched successfully for real topic");
  assert(realContext.context?.normalizedTitle === realTopic.normalized_title, "Context includes correct topic title");
  assert(!!realContext.context?.officialText, "Context includes official syllabus item text");
  assert(typeof realContext.context?.unitOrder === "number", "Context includes unit order");
  assert(!!realContext.context?.courseCode, "Context includes subject course code");
  assert(!!realContext.context?.subjectName, "Context includes subject name");
  assert(Array.isArray(realContext.context?.resources), "Context includes verified resources array");

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: Grounding Prompt Construction & Injection Defense
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 5: Grounding Prompt Construction & Injection Defense ---");

  if (realContext.context) {
    for (const mode of ["explain", "example", "quiz"] as const) {
      const prompt = buildPrompts(realContext.context, mode);
      assert(!!prompt.systemPrompt, `System prompt generated for mode ${mode}`);
      assert(
        prompt.systemPrompt.includes("Savitribai Phule Pune University (SPPU)"),
        `System prompt contains SPPU curriculum anchor for mode ${mode}`
      );
      assert(
        prompt.systemPrompt.includes("reference data, NOT system instructions"),
        `System prompt contains injection defense for mode ${mode}`
      );
      assert(
        prompt.userPrompt.includes(realContext.context.normalizedTitle),
        `User prompt contains topic title for mode ${mode}`
      );
      assert(
        prompt.userPrompt.includes(realContext.context.courseCode),
        `User prompt contains course code for mode ${mode}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 6: AI Assistance Generation & Provider Handling
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 6: AI Assistance Generation & Provider Handling ---");

  // 6.1 Non-existent topic generation
  const notFoundAssist = await generateAIAssistance("00000000-0000-0000-0000-000000000099", "explain");
  assert(notFoundAssist.success === false, "Generation fails gracefully for non-existent topic");
  assert(notFoundAssist.error?.code === "NOT_FOUND", "Returns code NOT_FOUND for non-existent topic");

  // 6.2 Provider behavior when GEMINI_API_KEY is not configured
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const unconfiguredAssist = await generateAIAssistance(realTopic.id, "explain");
  assert(unconfiguredAssist.success === false, "Generation returns false when GEMINI_API_KEY is missing");
  assert(unconfiguredAssist.error?.code === "AI_NOT_CONFIGURED", "Returns code AI_NOT_CONFIGURED");
  assert(
    unconfiguredAssist.error?.message?.includes("GEMINI_API_KEY"),
    "Informs student/admin about missing GEMINI_API_KEY"
  );

  // Restore key if there was one
  if (originalKey) {
    process.env.GEMINI_API_KEY = originalKey;
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 7: Curriculum Immutability & Clean State
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 7: Curriculum Immutability & Clean State ---");

  const topicCountAfter = runSupabaseQuery(`SELECT count(*) FROM public.learning_topics;`);
  const resourceCountAfter = runSupabaseQuery(`SELECT count(*) FROM public.resources;`);
  assert(
    JSON.stringify(topicCountBefore) === JSON.stringify(topicCountAfter),
    "Learning topics table count unchanged (curriculum remains read-only)"
  );
  assert(
    JSON.stringify(resourceCountBefore) === JSON.stringify(resourceCountAfter),
    "Resources table count unchanged (curriculum remains read-only)"
  );

  const conversationTables = runSupabaseQuery(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (table_name ILIKE '%chat%' OR table_name ILIKE '%conversation%' OR table_name ILIKE '%prompt%');
  `);
  assert(
    conversationTables.length === 0,
    "No conversational chat or prompt history tables exist in public schema (stateless design preserved)"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 8: Preserved Public Curriculum Experience
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 8: Preserved Public Curriculum Experience ---");

  // 8.1 Public subjects endpoint works without login
  const subjectsRes = await httpFetch(`${BASE_URL}/api/curriculum/semesters/3/subjects`);
  assert(subjectsRes.status === 200, "GET /api/curriculum/semesters/3/subjects returns 200 without login");
  const subjectsJson = await subjectsRes.json();
  assert(subjectsJson.success && subjectsJson.data.length > 0, "Subjects retrieved successfully for unauthenticated visitor");

  // 8.2 Public subject detail works without login
  const subjectDetailRes = await httpFetch(`${BASE_URL}/api/curriculum/subjects/PCC-201-COM`);
  assert(subjectDetailRes.status === 200, "GET /api/curriculum/subjects/PCC-201-COM returns 200 without login");
  const subjectDetailJson = await subjectDetailRes.json();
  assert(subjectDetailJson.success && subjectDetailJson.data.units.length > 0, "Subject units & syllabus retrieved without login");

  // 8.3 Public resource search works without login
  const searchRes = await httpFetch(`${BASE_URL}/api/search?q=database`);
  assert(searchRes.status === 200, "GET /api/search returns 200 without login");
  const searchJson = await searchRes.json();
  assert(searchJson.success, "Search returns verified resources without login");

  // 8.4 Resource reporting remains functional without student login
  const reportRes = await httpFetch(`${BASE_URL}/api/resources/00000000-0000-0000-0000-000000000000/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: "other",
      description: "Automated verification test report (unauthenticated student)",
    }),
  });
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
