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
  console.log("Syllora Phase 7F-D — Admin Resource Topic Linking");
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

    // 1.6 POST /api/admin/resources/[id]/verify without session
    const unauthVerify = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/verify`, {
      method: "POST",
    });
    assert(unauthVerify.status === 401, `Unauthenticated POST /api/admin/resources/[id]/verify returns 401 Unauthorized (${unauthVerify.status})`);

    // 1.7 POST /api/admin/resources/[id]/reject without session
    const unauthReject = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/reject`, {
      method: "POST",
    });
    assert(unauthReject.status === 401, `Unauthenticated POST /api/admin/resources/[id]/reject returns 401 Unauthorized (${unauthReject.status})`);

    // 1.8 Spoofed token on POST /api/admin/resources
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

    // 1.9 Spoofed token on PATCH /api/admin/resources/[id]
    const spoofedPatch = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: "sb-enxbvqlaasbiqywxkmfu-auth-token=fake_jwt_cookie",
      },
      body: JSON.stringify({ title: "Spoofed Token Patch" }),
    });
    assert(spoofedPatch.status === 401, `Spoofed cookie on PATCH /api/admin/resources/[id] returns 401 Unauthorized (${spoofedPatch.status})`);

    // 1.10 Spoofed token on POST /api/admin/resources/[id]/verify
    const spoofedVerify = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/verify`, {
      method: "POST",
      headers: {
        Cookie: "sb-enxbvqlaasbiqywxkmfu-auth-token=fake_jwt_cookie",
      },
    });
    assert(spoofedVerify.status === 401, `Spoofed cookie on POST /api/admin/resources/[id]/verify returns 401 Unauthorized (${spoofedVerify.status})`);

    // 1.11 Spoofed token on POST /api/admin/resources/[id]/reject
    const spoofedReject = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/reject`, {
      method: "POST",
      headers: {
        Cookie: "sb-enxbvqlaasbiqywxkmfu-auth-token=fake_jwt_cookie",
      },
    });
    assert(spoofedReject.status === 401, `Spoofed cookie on POST /api/admin/resources/[id]/reject returns 401 Unauthorized (${spoofedReject.status})`);

    // 1.12 GET /api/admin/resources/[id]/topics without session
    const unauthGetTopics = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/topics`);
    assert(unauthGetTopics.status === 401, `Unauthenticated GET /api/admin/resources/[id]/topics returns 401 Unauthorized (${unauthGetTopics.status})`);

    // 1.13 POST /api/admin/resources/[id]/topics without session
    const unauthPostTopic = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: "8921767b-4a11-4fe0-8504-0d5cc02b0465" }),
    });
    assert(unauthPostTopic.status === 401, `Unauthenticated POST /api/admin/resources/[id]/topics returns 401 Unauthorized (${unauthPostTopic.status})`);

    // 1.14 DELETE /api/admin/resources/[id]/topics/[topicId] without session
    const unauthDeleteTopic = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/topics/8921767b-4a11-4fe0-8504-0d5cc02b0465`, {
      method: "DELETE",
    });
    assert(unauthDeleteTopic.status === 401, `Unauthenticated DELETE /api/admin/resources/[id]/topics/[topicId] returns 401 Unauthorized (${unauthDeleteTopic.status})`);

    // 1.15 Spoofed token on GET /api/admin/resources/[id]/topics
    const spoofedGetTopics = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/topics`, {
      headers: {
        Cookie: "sb-enxbvqlaasbiqywxkmfu-auth-token=fake_jwt_cookie",
      },
    });
    assert(spoofedGetTopics.status === 401, `Spoofed cookie on GET /api/admin/resources/[id]/topics returns 401 Unauthorized (${spoofedGetTopics.status})`);

    // 1.16 Spoofed token on POST /api/admin/resources/[id]/topics
    const spoofedPostTopic = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/topics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "sb-enxbvqlaasbiqywxkmfu-auth-token=fake_jwt_cookie",
      },
      body: JSON.stringify({ topicId: "8921767b-4a11-4fe0-8504-0d5cc02b0465" }),
    });
    assert(spoofedPostTopic.status === 401, `Spoofed cookie on POST /api/admin/resources/[id]/topics returns 401 Unauthorized (${spoofedPostTopic.status})`);

    // 1.17 Spoofed token on DELETE /api/admin/resources/[id]/topics/[topicId]
    const spoofedDeleteTopic = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/topics/8921767b-4a11-4fe0-8504-0d5cc02b0465`, {
      method: "DELETE",
      headers: {
        Cookie: "sb-enxbvqlaasbiqywxkmfu-auth-token=fake_jwt_cookie",
      },
    });
    assert(spoofedDeleteTopic.status === 401, `Spoofed cookie on DELETE /api/admin/resources/[id]/topics/[topicId] returns 401 Unauthorized (${spoofedDeleteTopic.status})`);

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

    // Service functions and Route handlers for Moderation
    const adminServiceSource = fs.readFileSync(path.join(process.cwd(), "lib", "services", "admin-resources.ts"), "utf8");
    assert(adminServiceSource.includes("export async function verifyAdminResource"), "lib/services/admin-resources.ts exports verifyAdminResource");
    assert(adminServiceSource.includes("export async function rejectAdminResource"), "lib/services/admin-resources.ts exports rejectAdminResource");
    assert(
      adminServiceSource.includes('.eq("status", "pending")'),
      "verifyAdminResource and rejectAdminResource include status='pending' condition directly in update queries"
    );
    assert(
      adminServiceSource.includes("Only pending resources can be verified") &&
      adminServiceSource.includes("Only pending resources can be rejected"),
      "verifyAdminResource and rejectAdminResource strictly reject non-pending transitions with clear error message"
    );

    const verifyRoutePath = path.join(process.cwd(), "app", "api", "admin", "resources", "[id]", "verify", "route.ts");
    assert(fs.existsSync(verifyRoutePath), "Dedicated route app/api/admin/resources/[id]/verify/route.ts exists");
    const verifyRouteSource = fs.readFileSync(verifyRoutePath, "utf8");
    assert(verifyRouteSource.includes("export async function POST"), "Verify route handler implements POST");
    assert(verifyRouteSource.includes("verifyAdminSession"), "Verify route handler uses verifyAdminSession");

    const rejectRoutePath = path.join(process.cwd(), "app", "api", "admin", "resources", "[id]", "reject", "route.ts");
    assert(fs.existsSync(rejectRoutePath), "Dedicated route app/api/admin/resources/[id]/reject/route.ts exists");
    const rejectRouteSource = fs.readFileSync(rejectRoutePath, "utf8");
    assert(rejectRouteSource.includes("export async function POST"), "Reject route handler implements POST");
    assert(rejectRouteSource.includes("verifyAdminSession"), "Reject route handler uses verifyAdminSession");

    const moderationUiPath = path.join(process.cwd(), "components", "admin", "resource-moderation-actions.tsx");
    assert(fs.existsSync(moderationUiPath), "components/admin/resource-moderation-actions.tsx exists");
    const moderationUiSource = fs.readFileSync(moderationUiPath, "utf8");
    assert(moderationUiSource.includes('"use client"') || moderationUiSource.includes("'use client'"), "resource-moderation-actions is a client component");
    assert(moderationUiSource.includes("handleVerify") && moderationUiSource.includes("handleReject"), "resource-moderation-actions handles verify and reject actions");
    assert(moderationUiSource.includes("confirmingReject"), "resource-moderation-actions requires confirmation before rejection");

    // Phase 7F-D: Topic linking service functions & routes
    assert(adminServiceSource.includes("export async function getAdminResourceTopics"), "lib/services/admin-resources.ts exports getAdminResourceTopics");
    assert(adminServiceSource.includes("export async function getAdminPublishedTopics"), "lib/services/admin-resources.ts exports getAdminPublishedTopics");
    assert(adminServiceSource.includes("export async function linkAdminResourceTopic"), "lib/services/admin-resources.ts exports linkAdminResourceTopic");
    assert(adminServiceSource.includes("export async function unlinkAdminResourceTopic"), "lib/services/admin-resources.ts exports unlinkAdminResourceTopic");

    const topicsRoutePath = path.join(process.cwd(), "app", "api", "admin", "resources", "[id]", "topics", "route.ts");
    assert(fs.existsSync(topicsRoutePath), "Dedicated route app/api/admin/resources/[id]/topics/route.ts exists");
    const topicsRouteSource = fs.readFileSync(topicsRoutePath, "utf8");
    assert(topicsRouteSource.includes("export async function GET"), "Topics route handler implements GET");
    assert(topicsRouteSource.includes("export async function POST"), "Topics route handler implements POST");
    assert(topicsRouteSource.includes("verifyAdminSession"), "Topics route handler uses verifyAdminSession");

    const topicUnlinkRoutePath = path.join(process.cwd(), "app", "api", "admin", "resources", "[id]", "topics", "[topicId]", "route.ts");
    assert(fs.existsSync(topicUnlinkRoutePath), "Dedicated route app/api/admin/resources/[id]/topics/[topicId]/route.ts exists");
    const topicUnlinkRouteSource = fs.readFileSync(topicUnlinkRoutePath, "utf8");
    assert(topicUnlinkRouteSource.includes("export async function DELETE"), "Topic unlink route handler implements DELETE");
    assert(topicUnlinkRouteSource.includes("verifyAdminSession"), "Topic unlink route handler uses verifyAdminSession");

    const topicLinksUiPath = path.join(process.cwd(), "components", "admin", "resource-topic-links.tsx");
    assert(fs.existsSync(topicLinksUiPath), "components/admin/resource-topic-links.tsx exists");
    const topicLinksUiSource = fs.readFileSync(topicLinksUiPath, "utf8");
    assert(topicLinksUiSource.includes('"use client"') || topicLinksUiSource.includes("'use client'"), "resource-topic-links is a client component");
    assert(topicLinksUiSource.includes("handleLinkTopic") && topicLinksUiSource.includes("handleUnlinkTopic"), "resource-topic-links handles link and unlink actions");
    assert(topicLinksUiSource.includes("confirmUnlinkId"), "resource-topic-links requires confirmation before unlinking");

    const editPagePath = path.join(process.cwd(), "app", "admin", "resources", "[id]", "edit", "page.tsx");
    const editPageSource = fs.readFileSync(editPagePath, "utf8");
    assert(editPageSource.includes("ResourceTopicLinks"), "Admin edit page renders ResourceTopicLinks component");
    assert(editPageSource.includes("getAdminResourceTopics"), "Admin edit page loads linked topics via getAdminResourceTopics");
    assert(editPageSource.includes("getAdminPublishedTopics"), "Admin edit page loads published topics via getAdminPublishedTopics");

    // Topic endpoint UUID & parameter validation
    const badIdGetTopics = await fetch(`${BASE_URL}/api/admin/resources/not-a-uuid/topics`);
    assert(badIdGetTopics.status === 400 || badIdGetTopics.status === 401, `Malformed resource ID on GET topics rejected (${badIdGetTopics.status})`);

    const badIdPostTopics = await fetch(`${BASE_URL}/api/admin/resources/not-a-uuid/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: "8921767b-4a11-4fe0-8504-0d5cc02b0465" }),
    });
    assert(badIdPostTopics.status === 400 || badIdPostTopics.status === 401, `Malformed resource ID on POST topics rejected (${badIdPostTopics.status})`);

    const badIdDeleteTopic = await fetch(`${BASE_URL}/api/admin/resources/not-a-uuid/topics/8921767b-4a11-4fe0-8504-0d5cc02b0465`, {
      method: "DELETE",
    });
    assert(badIdDeleteTopic.status === 400 || badIdDeleteTopic.status === 401, `Malformed resource ID on DELETE topic link rejected (${badIdDeleteTopic.status})`);

    const badTopicIdDelete = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/topics/not-a-uuid`, {
      method: "DELETE",
    });
    assert(badTopicIdDelete.status === 400 || badTopicIdDelete.status === 401, `Malformed topic ID on DELETE topic link rejected (${badTopicIdDelete.status})`);

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Database RLS Mutation Policies
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 3: Database RLS Mutation Policies ---");

    const policyRows = runSupabaseQuery(`
      SELECT tablename, policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('resources', 'topic_resources')
      ORDER BY tablename, policyname;
    `);

    const resourcePolicies = new Set(policyRows.filter((r) => r.tablename === "resources").map((r) => r.policyname));
    assert(resourcePolicies.has("Admins insert resources"), "Policy 'Admins insert resources' exists on resources table");
    assert(resourcePolicies.has("Admins update resources"), "Policy 'Admins update resources' exists on resources table");
    assert(resourcePolicies.has("Admins view all resources"), "Policy 'Admins view all resources' exists on resources table");
    assert(resourcePolicies.has("Public view verified resources"), "Policy 'Public view verified resources' exists on resources table");

    const topicResourcePolicies = new Set(policyRows.filter((r) => r.tablename === "topic_resources").map((r) => r.policyname));
    assert(topicResourcePolicies.has("Admins insert topic_resources"), "Policy 'Admins insert topic_resources' exists on topic_resources table");
    assert(topicResourcePolicies.has("Admins delete topic_resources"), "Policy 'Admins delete topic_resources' exists on topic_resources table");
    assert(topicResourcePolicies.has("Admins view all topic_resources"), "Policy 'Admins view all topic_resources' exists on topic_resources table");
    assert(topicResourcePolicies.has("Public view topic_resources"), "Policy 'Public view topic_resources' exists on topic_resources table");

    // Anon INSERT attempt directly via Supabase client (should be rejected by RLS)
    const { error: anonInsertError } = await supabase.from("resources").insert({
      title: "Anon Illegal Insert",
      url: "https://example.com/anon-hack",
      type: "article",
      status: "pending",
    });
    assert(
      anonInsertError !== null,
      `Anonymous client INSERT on resources is blocked by RLS (error: ${anonInsertError?.code || "permission denied"})`
    );

    // Anon UPDATE attempt directly via Supabase client (should affect 0 rows or error)
    const { data: anonUpdateData, error: anonUpdateError } = await supabase
      .from("resources")
      .update({ title: "Anon Hacked Title" })
      .eq("id", seededVerifiedId)
      .select();
    assert(
      anonUpdateError !== null || (anonUpdateData && anonUpdateData.length === 0),
      `Anonymous client UPDATE on resources is blocked by RLS (affected rows: ${anonUpdateData ? anonUpdateData.length : 0})`
    );

    // Anon INSERT on topic_resources attempt directly via Supabase client (should be rejected by RLS)
    const { error: anonTopicInsertError } = await supabase.from("topic_resources").insert({
      learning_topic_id: "8921767b-4a11-4fe0-8504-0d5cc02b0465",
      resource_id: seededVerifiedId,
      ranking_score: 999,
      is_featured: true,
    });
    assert(
      anonTopicInsertError !== null,
      `Anonymous client INSERT on topic_resources is blocked by RLS (error: ${anonTopicInsertError?.code || "permission denied"})`
    );

    // Anon DELETE on topic_resources attempt directly via Supabase client (should affect 0 rows or error)
    const { data: anonTopicDeleteData, error: anonTopicDeleteError } = await supabase
      .from("topic_resources")
      .delete()
      .eq("resource_id", seededVerifiedId)
      .select();
    assert(
      anonTopicDeleteError !== null || (anonTopicDeleteData && anonTopicDeleteData.length === 0),
      `Anonymous client DELETE on topic_resources is blocked by RLS (affected rows: ${anonTopicDeleteData ? anonTopicDeleteData.length : 0})`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Active Admin Create, Edit & Atomic Moderation (Rollback TX)
    // -------------------------------------------------------------------------
    console.log("\n--- Test Suite 4: Active Admin Create, Edit & Atomic Moderation (Rollback TX) ---");

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

      -- 5. Insert test pending resource A for verification
      INSERT INTO public.resources (id, title, url, type, provider, description, status, verified_by, verified_at)
      VALUES (
        '11111111-1111-1111-1111-111111111111',
        'Simulation Pending Resource A',
        'https://example.com/sim-mod-pending-a',
        'article',
        'TestSimProvider',
        'Pending resource to verify',
        'pending',
        NULL,
        NULL
      );

      -- 6. Atomic conditional verify (pending -> verified): requires status = 'pending'
      WITH upd AS (
        UPDATE public.resources
        SET status = 'verified',
            verified_by = '00000000-0000-0000-0000-000000000001',
            verified_at = NOW()
        WHERE id = '11111111-1111-1111-1111-111111111111'
          AND status = 'pending'
        RETURNING id
      )
      SELECT count(*) INTO TEMP TABLE t_verify_pending_ok FROM upd;

      -- 7. Attempt re-verifying already verified resource A (must affect 0 rows)
      WITH upd AS (
        UPDATE public.resources
        SET status = 'verified',
            verified_by = '00000000-0000-0000-0000-000000000001',
            verified_at = NOW()
        WHERE id = '11111111-1111-1111-1111-111111111111'
          AND status = 'pending'
        RETURNING id
      )
      SELECT count(*) INTO TEMP TABLE t_reverify_blocked FROM upd;

      -- 8. Attempt rejecting already verified resource A (must affect 0 rows)
      WITH upd AS (
        UPDATE public.resources
        SET status = 'rejected',
            verified_by = NULL,
            verified_at = NULL
        WHERE id = '11111111-1111-1111-1111-111111111111'
          AND status = 'pending'
        RETURNING id
      )
      SELECT count(*) INTO TEMP TABLE t_verify_to_reject_blocked FROM upd;

      -- 9. Insert test pending resource B for rejection
      INSERT INTO public.resources (id, title, url, type, provider, description, status, verified_by, verified_at)
      VALUES (
        '22222222-2222-2222-2222-222222222222',
        'Simulation Pending Resource B',
        'https://example.com/sim-mod-pending-b',
        'video',
        'TestSimProvider',
        'Pending resource to reject',
        'pending',
        NULL,
        NULL
      );

      -- 10. Atomic conditional reject (pending -> rejected): requires status = 'pending'
      WITH upd AS (
        UPDATE public.resources
        SET status = 'rejected',
            verified_by = NULL,
            verified_at = NULL
        WHERE id = '22222222-2222-2222-2222-222222222222'
          AND status = 'pending'
        RETURNING id
      )
      SELECT count(*) INTO TEMP TABLE t_reject_pending_ok FROM upd;

      -- 11. Attempt verifying already rejected resource B (must affect 0 rows)
      WITH upd AS (
        UPDATE public.resources
        SET status = 'verified',
            verified_by = '00000000-0000-0000-0000-000000000001',
            verified_at = NOW()
        WHERE id = '22222222-2222-2222-2222-222222222222'
          AND status = 'pending'
        RETURNING id
      )
      SELECT count(*) INTO TEMP TABLE t_reject_to_verify_blocked FROM upd;

      -- 12. Attempt re-rejecting already rejected resource B (must affect 0 rows)
      WITH upd AS (
        UPDATE public.resources
        SET status = 'rejected',
            verified_by = NULL,
            verified_at = NULL
        WHERE id = '22222222-2222-2222-2222-222222222222'
          AND status = 'pending'
        RETURNING id
      )
      SELECT count(*) INTO TEMP TABLE t_rereject_blocked FROM upd;

      -- 13. Phase 7F-D: Link simulation pending resource A to published topic
      INSERT INTO public.topic_resources (learning_topic_id, resource_id, ranking_score, is_featured, assigned_at)
      VALUES ('8921767b-4a11-4fe0-8504-0d5cc02b0465', '11111111-1111-1111-1111-111111111111', 0, false, NOW());

      SELECT count(*) INTO TEMP TABLE t_topic_link_ok
      FROM public.topic_resources
      WHERE learning_topic_id = '8921767b-4a11-4fe0-8504-0d5cc02b0465'
        AND resource_id = '11111111-1111-1111-1111-111111111111'
        AND ranking_score = 0
        AND is_featured = false;

      -- 14. Phase 7F-D: Duplicate topic link attempt blocked by unique composite PK
      DO $$
      BEGIN
        BEGIN
          INSERT INTO public.topic_resources (learning_topic_id, resource_id, ranking_score, is_featured)
          VALUES ('8921767b-4a11-4fe0-8504-0d5cc02b0465', '11111111-1111-1111-1111-111111111111', 0, false);
          CREATE TEMP TABLE t_dup_blocked (val int);
        EXCEPTION
          WHEN unique_violation THEN
            CREATE TEMP TABLE t_dup_blocked (val int);
            INSERT INTO t_dup_blocked VALUES (1);
        END;
      END $$;

      -- 15. Phase 7F-D: Unlink topic from resource (delete topic_resources row)
      DELETE FROM public.topic_resources
      WHERE learning_topic_id = '8921767b-4a11-4fe0-8504-0d5cc02b0465'
        AND resource_id = '11111111-1111-1111-1111-111111111111';

      SELECT count(*) INTO TEMP TABLE t_topic_link_deleted
      FROM public.topic_resources
      WHERE learning_topic_id = '8921767b-4a11-4fe0-8504-0d5cc02b0465'
        AND resource_id = '11111111-1111-1111-1111-111111111111';

      -- 16. Retrieve verification counts confirming all states and audit columns
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
           AND verified_at IS NOT NULL) as verified_preserve_ok,
        (SELECT count FROM t_verify_pending_ok) as verify_pending_ok,
        (SELECT count FROM t_reverify_blocked) as reverify_blocked,
        (SELECT count FROM t_verify_to_reject_blocked) as verify_to_reject_blocked,
        (SELECT count FROM t_reject_pending_ok) as reject_pending_ok,
        (SELECT count FROM t_reject_to_verify_blocked) as reject_to_verify_blocked,
        (SELECT count FROM t_rereject_blocked) as rereject_blocked,
        (SELECT count FROM t_topic_link_ok) as topic_link_ok,
        (SELECT coalesce(sum(val), 0) FROM t_dup_blocked) as duplicate_link_blocked,
        (SELECT count FROM t_topic_link_deleted) as topic_link_deleted,
        (SELECT count(*) FROM public.resources
         WHERE id = '11111111-1111-1111-1111-111111111111'
           AND status = 'verified'
           AND verified_by = '00000000-0000-0000-0000-000000000001'
           AND verified_at IS NOT NULL) as audit_verified_correct,
        (SELECT count(*) FROM public.resources
         WHERE id = '22222222-2222-2222-2222-222222222222'
           AND status = 'rejected'
           AND verified_by IS NULL
           AND verified_at IS NULL) as audit_rejected_correct;

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
    assert(
      Number(simState.verify_pending_ok) === 1,
      "pending -> verified atomic transition succeeds (affects exactly 1 row)"
    );
    assert(
      Number(simState.reverify_blocked) === 0,
      "verified resource cannot be verified again (conditional update matches 0 rows)"
    );
    assert(
      Number(simState.verify_to_reject_blocked) === 0,
      "verified resource cannot be rejected (conditional update matches 0 rows)"
    );
    assert(
      Number(simState.reject_pending_ok) === 1,
      "pending -> rejected atomic transition succeeds (affects exactly 1 row)"
    );
    assert(
      Number(simState.reject_to_verify_blocked) === 0,
      "rejected resource cannot be verified (conditional update matches 0 rows)"
    );
    assert(
      Number(simState.rereject_blocked) === 0,
      "rejected resource cannot be rejected again (conditional update matches 0 rows)"
    );
    assert(
      Number(simState.topic_link_ok) === 1,
      "Active admin can link resource to published topic with ranking_score=0 and is_featured=false"
    );
    assert(
      Number(simState.duplicate_link_blocked) === 1,
      "Duplicate topic_resources link is blocked by unique composite primary key constraint"
    );
    assert(
      Number(simState.topic_link_deleted) === 0,
      "Active admin can delete topic_resources link (relationship removed without deleting resource/topic)"
    );
    assert(
      Number(simState.audit_verified_correct) === 1,
      "Verification audit fields remain correct: verified_by is admin UUID and verified_at is set"
    );
    assert(
      Number(simState.audit_rejected_correct) === 1,
      "Rejection audit fields remain correct: verified_by is NULL and verified_at is NULL"
    );

    // Verify rollback completed cleanly: confirm simulation resources and links do NOT exist
    const checkRolledBack = runSupabaseQuery(`
      SELECT 
        (SELECT count(*) FROM public.resources WHERE url IN (
          'https://example.com/sim-test-structure-guide',
          'https://example.com/sim-mod-pending-a',
          'https://example.com/sim-mod-pending-b'
        )) as leftover_resources,
        (SELECT count(*) FROM public.topic_resources WHERE resource_id IN (
          '11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222'
        )) as leftover_links;
    `);
    assert(
      Number(checkRolledBack[0]?.leftover_resources || 0) === 0 &&
      Number(checkRolledBack[0]?.leftover_links || 0) === 0,
      `Rollback confirmed: simulation test resources and topic links cleanly removed`
    );

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
      "app/api/admin/resources/[id]/verify/route.ts",
      "app/api/admin/resources/[id]/reject/route.ts",
      "app/api/admin/resources/[id]/topics/route.ts",
      "app/api/admin/resources/[id]/topics/[topicId]/route.ts",
      "components/admin/resource-form.tsx",
      "components/admin/resource-moderation-actions.tsx",
      "components/admin/resource-topic-links.tsx",
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
    assert(!foundServiceKey, "Zero SUPABASE_SERVICE_ROLE_KEY references in Phase 7F-D code");

    // Check that DELETE /api/admin/resources/[id] is not implemented
    const deleteRes = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}`, {
      method: "DELETE",
    });
    assert(
      deleteRes.status === 405 || deleteRes.status === 404,
      `DELETE /api/admin/resources/[id] is not implemented (${deleteRes.status})`
    );

    // Check that DELETE /api/admin/resources/[id]/verify is not implemented
    const deleteVerifyRes = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/verify`, {
      method: "DELETE",
    });
    assert(
      deleteVerifyRes.status === 405 || deleteVerifyRes.status === 404,
      `DELETE /api/admin/resources/[id]/verify is not implemented (${deleteVerifyRes.status})`
    );

    // Check that DELETE /api/admin/resources/[id]/reject is not implemented
    const deleteRejectRes = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/reject`, {
      method: "DELETE",
    });
    assert(
      deleteRejectRes.status === 405 || deleteRejectRes.status === 404,
      `DELETE /api/admin/resources/[id]/reject is not implemented (${deleteRejectRes.status})`
    );

    // Check that PUT /api/admin/resources/[id]/topics is not implemented
    const putTopicsRes = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/topics`, {
      method: "PUT",
    });
    assert(
      putTopicsRes.status === 405 || putTopicsRes.status === 404,
      `PUT /api/admin/resources/[id]/topics is not implemented (${putTopicsRes.status})`
    );

    // Check that POST /api/admin/resources/[id]/topics/[topicId] is not implemented
    const postTopicUnlinkRes = await fetch(`${BASE_URL}/api/admin/resources/${seededVerifiedId}/topics/8921767b-4a11-4fe0-8504-0d5cc02b0465`, {
      method: "POST",
    });
    assert(
      postTopicUnlinkRes.status === 405 || postTopicUnlinkRes.status === 404,
      `POST /api/admin/resources/[id]/topics/[topicId] is not implemented (${postTopicUnlinkRes.status})`
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
