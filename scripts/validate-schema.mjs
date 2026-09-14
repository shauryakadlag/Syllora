import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

async function runValidation() {
  console.log("=== Starting Syllora Phase 4 Schema Validation ===\n");
  const db = new PGlite();

  // 1. Setup Supabase mock environment (auth schema, auth.users, auth.uid(), roles, uuid fallback)
  console.log("1. Initializing Supabase mock environment...");
  await db.exec(`
    CREATE OR REPLACE FUNCTION uuid_generate_v4() RETURNS uuid AS $$
      SELECT gen_random_uuid();
    $$ LANGUAGE sql;

    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT
    );

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$ LANGUAGE sql STABLE;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
      END IF;
    END
    $$;

    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  `);
  console.log("   [OK] Auth schema, auth.uid(), and roles configured.\n");

  // 2. Load and execute the canonical migration SQL
  console.log("2. Executing canonical migration SQL...");
  const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260914000000_phase_4_schema_v1.sql");
  let migrationSql = fs.readFileSync(migrationPath, "utf8");

  // In PGlite WASM, uuid-ossp extension file is not in WASM filesystem, but uuid_generate_v4() is already defined above.
  // We mock the extension creation command for WASM compatibility without altering the migration file itself.
  const executableSql = migrationSql.replace(
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
    '-- uuid-ossp mocked via native gen_random_uuid()'
  );

  try {
    await db.exec(executableSql);
    console.log("   [OK] Canonical migration SQL executed with ZERO errors.\n");
  } catch (err) {
    console.error("   [ERROR] Migration execution failed:", err);
    process.exit(1);
  }

  // Grant SELECT to anon and authenticated as Supabase PostgREST does for public schema
  await db.exec(`
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
  `);

  // 3. Confirm all tables exist
  console.log("3. Verifying created tables...");
  const expectedTables = [
    "universities",
    "patterns",
    "branches",
    "semesters",
    "subjects",
    "units",
    "syllabus_items",
    "admins",
    "learning_topics",
    "resources",
    "topic_resources"
  ];

  const tableRes = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const actualTables = tableRes.rows.map(r => r.table_name);
  for (const t of expectedTables) {
    if (actualTables.includes(t)) {
      console.log(`   [OK] Table: ${t}`);
    } else {
      throw new Error(`Missing expected table: ${t}`);
    }
  }
  console.log(`   All ${expectedTables.length} tables verified.\n`);

  // 4. Confirm Enums exist
  console.log("4. Verifying created enum types...");
  const expectedEnums = ["resource_status", "resource_type", "publish_status"];
  const enumRes = await db.query(`
    SELECT typname FROM pg_type WHERE typtype = 'e';
  `);
  const actualEnums = enumRes.rows.map(r => r.typname);
  for (const e of expectedEnums) {
    if (actualEnums.includes(e)) {
      console.log(`   [OK] Enum: ${e}`);
    } else {
      throw new Error(`Missing expected enum: ${e}`);
    }
  }
  console.log(`   All ${expectedEnums.length} enums verified.\n`);

  // 5. Confirm Indexes exist
  console.log("5. Verifying custom indexes...");
  const expectedIndexes = [
    "idx_patterns_university",
    "idx_branches_pattern",
    "idx_semesters_branch",
    "idx_subjects_semester",
    "idx_units_subject",
    "idx_syllabus_items_unit",
    "idx_learning_topics_syllabus",
    "idx_learning_topics_status",
    "idx_resources_status",
    "idx_topic_resources_resource"
  ];
  const idxRes = await db.query(`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
  `);
  const actualIndexes = idxRes.rows.map(r => r.indexname);
  for (const idx of expectedIndexes) {
    if (actualIndexes.includes(idx)) {
      console.log(`   [OK] Index: ${idx}`);
    } else {
      throw new Error(`Missing expected index: ${idx}`);
    }
  }
  console.log(`   All ${expectedIndexes.length} indexes verified.\n`);

  // 6. Confirm RLS Policies exist
  console.log("6. Verifying RLS policies...");
  const expectedPolicies = [
    { table: "universities", policy: "Public view universities" },
    { table: "patterns", policy: "Public view patterns" },
    { table: "branches", policy: "Public view branches" },
    { table: "semesters", policy: "Public view semesters" },
    { table: "subjects", policy: "Public view subjects" },
    { table: "units", policy: "Public view units" },
    { table: "syllabus_items", policy: "Public view syllabus_items" },
    { table: "learning_topics", policy: "Public view published topics" },
    { table: "resources", policy: "Public view verified resources" },
    { table: "topic_resources", policy: "Public view topic_resources" },
    { table: "admins", policy: "Admins view admins roster" }
  ];
  const polRes = await db.query(`
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
  `);
  for (const ep of expectedPolicies) {
    const found = polRes.rows.some(r => r.tablename === ep.table && r.policyname === ep.policy);
    if (found) {
      console.log(`   [OK] Policy: "${ep.policy}" ON ${ep.table}`);
    } else {
      throw new Error(`Missing expected policy: ${ep.policy} on ${ep.table}`);
    }
  }
  console.log(`   All ${expectedPolicies.length} RLS policies verified.\n`);

  // 7. Validate Constraints
  console.log("7. Testing database constraints...");
  // Test semester_number check (must be 1-8)
  const u1 = (await db.query(`INSERT INTO universities (name, acronym) VALUES ('Savitribai Phule Pune University', 'SPPU') RETURNING id`)).rows[0].id;
  const p1 = (await db.query(`INSERT INTO patterns (university_id, year_name) VALUES ('${u1}', '2024 Pattern') RETURNING id`)).rows[0].id;
  const b1 = (await db.query(`INSERT INTO branches (pattern_id, name) VALUES ('${p1}', 'Computer Engineering') RETURNING id`)).rows[0].id;
  
  try {
    await db.query(`INSERT INTO semesters (branch_id, semester_number) VALUES ('${b1}', 9)`);
    throw new Error("Check constraint failure: semester_number 9 was allowed!");
  } catch (err) {
    if (err.message.includes("check constraint") || err.message.includes("violates")) {
      console.log("   [OK] Check constraint caught invalid semester_number = 9");
    } else {
      throw err;
    }
  }

  // Test unique constraint on university acronym
  try {
    await db.query(`INSERT INTO universities (name, acronym) VALUES ('Duplicate SPPU', 'SPPU')`);
    throw new Error("Unique constraint failure: duplicate acronym allowed!");
  } catch (err) {
    if (err.message.includes("unique") || err.message.includes("duplicate")) {
      console.log("   [OK] Unique constraint caught duplicate university acronym 'SPPU'");
    } else {
      throw err;
    }
  }

  // Test admin setup and resource accountability check
  const adminUser = (await db.query(`INSERT INTO auth.users (email) VALUES ('admin@syllora.edu') RETURNING id`)).rows[0].id;
  await db.query(`INSERT INTO admins (id, role, is_active) VALUES ('${adminUser}', 'admin', true)`);

  // Resource with status 'verified' but missing verified_by or verified_at must fail
  try {
    await db.query(`INSERT INTO resources (title, url, type, status) VALUES ('Bad Verified', 'https://example.com/bad', 'video', 'verified')`);
    throw new Error("Check constraint failure: verified resource without verified_by/at allowed!");
  } catch (err) {
    if (err.message.includes("check constraint") || err.message.includes("violates")) {
      console.log("   [OK] Accountability check caught verified resource missing verified_by/at");
    } else {
      throw err;
    }
  }

  // Resource with status 'verified' WITH verified_by and verified_at succeeds
  const rVerified = (await db.query(`
    INSERT INTO resources (title, url, type, status, verified_by, verified_at) 
    VALUES ('Valid Verified Video', 'https://example.com/good', 'video', 'verified', '${adminUser}', NOW())
    RETURNING id
  `)).rows[0].id;
  console.log("   [OK] Valid verified resource with verified_by/at inserted successfully");

  // Test ON DELETE RESTRICT on verified_by in resources
  try {
    await db.query(`DELETE FROM admins WHERE id = '${adminUser}'`);
    throw new Error("ON DELETE RESTRICT failure: Admin was deleted despite having verified resources!");
  } catch (err) {
    if (err.message.toLowerCase().includes("restrict") || err.message.toLowerCase().includes("foreign key") || err.message.toLowerCase().includes("referenced")) {
      console.log("   [OK] ON DELETE RESTRICT prevented deleting admin with verified resources.");
    } else {
      throw err;
    }
  }
  console.log("   All constraint checks passed.\n");

  // 8. Populate additional test data for RLS testing
  console.log("8. Setting up test data for RLS testing...");
  const sem3 = (await db.query(`INSERT INTO semesters (branch_id, semester_number) VALUES ('${b1}', 3) RETURNING id`)).rows[0].id;
  const sub1 = (await db.query(`INSERT INTO subjects (semester_id, course_code, subject_name) VALUES ('${sem3}', '210241', 'Data Structures') RETURNING id`)).rows[0].id;
  const uUnit1 = (await db.query(`INSERT INTO units (subject_id, unit_number, unit_order, unit_name) VALUES ('${sub1}', 'Unit I', 1, 'Introduction to Data Structures') RETURNING id`)).rows[0].id;
  const syl1 = (await db.query(`INSERT INTO syllabus_items (unit_id, official_text, original_order) VALUES ('${uUnit1}', 'Abstract Data Types', 1) RETURNING id`)).rows[0].id;
  const syl2 = (await db.query(`INSERT INTO syllabus_items (unit_id, official_text, original_order) VALUES ('${uUnit1}', 'Array Representation', 2) RETURNING id`)).rows[0].id;

  // Topics: 1 published, 1 draft
  const tPublished = (await db.query(`INSERT INTO learning_topics (syllabus_item_id, normalized_title, status) VALUES ('${syl1}', 'Abstract Data Types Explained', 'published') RETURNING id`)).rows[0].id;
  const tDraft = (await db.query(`INSERT INTO learning_topics (syllabus_item_id, normalized_title, status) VALUES ('${syl2}', 'Array Basics', 'draft') RETURNING id`)).rows[0].id;

  // Resources: 1 verified (already inserted above), 1 pending
  const rPending = (await db.query(`INSERT INTO resources (title, url, type, status) VALUES ('Unverified Notes', 'https://example.com/notes', 'article', 'pending') RETURNING id`)).rows[0].id;

  // Topic resources combinations:
  // 1. Published topic + Verified resource -> MUST BE VISIBLE to public
  await db.query(`INSERT INTO topic_resources (learning_topic_id, resource_id) VALUES ('${tPublished}', '${rVerified}')`);
  // 2. Published topic + Pending resource -> MUST BE HIDDEN
  await db.query(`INSERT INTO topic_resources (learning_topic_id, resource_id) VALUES ('${tPublished}', '${rPending}')`);
  // 3. Draft topic + Verified resource -> MUST BE HIDDEN
  await db.query(`INSERT INTO topic_resources (learning_topic_id, resource_id) VALUES ('${tDraft}', '${rVerified}')`);
  // 4. Draft topic + Pending resource -> MUST BE HIDDEN
  await db.query(`INSERT INTO topic_resources (learning_topic_id, resource_id) VALUES ('${tDraft}', '${rPending}')`);
  console.log("   [OK] Test dataset populated.\n");

  // 9. Testing Anonymous Reads
  console.log("9. Testing Anonymous (anon) Read Permissions...");
  await db.exec(`SET ROLE anon;`);

  const anonUniv = await db.query(`SELECT count(*) as count FROM universities;`);
  if (parseInt(anonUniv.rows[0].count) === 1) {
    console.log("   [OK] Anon can read official curriculum (universities)");
  } else {
    throw new Error("Anon could not read universities");
  }

  // Published vs Draft topics
  const anonTopics = await db.query(`SELECT id, status FROM learning_topics;`);
  if (anonTopics.rows.length === 1 && anonTopics.rows[0].status === "published") {
    console.log("   [OK] Anon sees ONLY published learning_topics (drafts filtered out by RLS)");
  } else {
    throw new Error(`Anon topic read failure: expected 1 published topic, got ${anonTopics.rows.length}`);
  }

  // Verified vs Pending resources
  const anonResources = await db.query(`SELECT id, status FROM resources;`);
  if (anonResources.rows.length === 1 && anonResources.rows[0].status === "verified") {
    console.log("   [OK] Anon sees ONLY verified resources (pending/rejected filtered out by RLS)");
  } else {
    throw new Error(`Anon resource read failure: expected 1 verified resource, got ${anonResources.rows.length}`);
  }

  // Topic Resources
  const anonTopicRes = await db.query(`SELECT * FROM topic_resources;`);
  if (anonTopicRes.rows.length === 1 && anonTopicRes.rows[0].learning_topic_id === tPublished && anonTopicRes.rows[0].resource_id === rVerified) {
    console.log("   [OK] Anon sees ONLY topic_resources where topic is published AND resource is verified");
  } else {
    throw new Error(`Anon topic_resources read failure: expected 1 row, got ${anonTopicRes.rows.length}`);
  }

  // Admins roster read
  const anonAdmins = await db.query(`SELECT count(*) as count FROM admins;`);
  if (parseInt(anonAdmins.rows[0].count) === 0) {
    console.log("   [OK] Anon CANNOT view admins roster (0 rows returned by RLS)");
  } else {
    throw new Error(`Anon security breach: anon user can view admins roster!`);
  }

  // 10. Testing Anonymous & Authenticated Mutation Blocking
  console.log("\n10. Testing Mutation Blocking (INSERT / UPDATE / DELETE)...");
  // Test anon INSERT
  try {
    await db.query(`INSERT INTO universities (name, acronym) VALUES ('Hacked Univ', 'HACK')`);
    throw new Error("Security breach: Anon user was able to INSERT into universities!");
  } catch (err) {
    if (err.message.includes("permission denied") || err.message.includes("violates row-level security")) {
      console.log("   [OK] Anon INSERT blocked on universities");
    } else {
      throw err;
    }
  }

  // Test anon UPDATE
  try {
    await db.query(`UPDATE universities SET name = 'Modified Univ' WHERE acronym = 'SPPU'`);
    throw new Error("Security breach: Anon user was able to UPDATE universities!");
  } catch (err) {
    if (err.message.includes("permission denied") || err.message.includes("violates row-level security")) {
      console.log("   [OK] Anon UPDATE blocked on universities");
    } else {
      throw err;
    }
  }

  // Test anon DELETE
  try {
    await db.query(`DELETE FROM universities WHERE acronym = 'SPPU'`);
    throw new Error("Security breach: Anon user was able to DELETE from universities!");
  } catch (err) {
    if (err.message.includes("permission denied") || err.message.includes("violates row-level security")) {
      console.log("   [OK] Anon DELETE blocked on universities");
    } else {
      throw err;
    }
  }

  // Test authenticated non-admin mutations
  await db.exec(`SET ROLE authenticated;`);
  // Simulate regular authenticated user (not in admins)
  await db.exec(`SET "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000099';`);

  try {
    await db.query(`INSERT INTO learning_topics (syllabus_item_id, normalized_title) VALUES ('${syl1}', 'Student Added Topic')`);
    throw new Error("Security breach: Authenticated student was able to INSERT into learning_topics!");
  } catch (err) {
    if (err.message.includes("permission denied") || err.message.includes("violates row-level security")) {
      console.log("   [OK] Authenticated client INSERT blocked on learning_topics");
    } else {
      throw err;
    }
  }

  try {
    await db.query(`UPDATE learning_topics SET normalized_title = 'Tampered Title' WHERE id = '${tPublished}'`);
    throw new Error("Security breach: Authenticated student was able to UPDATE learning_topics!");
  } catch (err) {
    if (err.message.includes("permission denied") || err.message.includes("violates row-level security")) {
      console.log("   [OK] Authenticated client UPDATE blocked on learning_topics");
    } else {
      throw err;
    }
  }

  try {
    await db.query(`DELETE FROM learning_topics WHERE id = '${tPublished}'`);
    throw new Error("Security breach: Authenticated student was able to DELETE learning_topics!");
  } catch (err) {
    if (err.message.includes("permission denied") || err.message.includes("violates row-level security")) {
      console.log("   [OK] Authenticated client DELETE blocked on learning_topics");
    } else {
      throw err;
    }
  }

  // 11. Testing is_admin() Function and RLS Recursion Prevention
  console.log("\n11. Testing is_admin() function and RLS recursion prevention...");
  
  // Non-logged-in user
  await db.exec(`SET "request.jwt.claim.sub" = '';`);
  const nullAdminRes = await db.query(`SELECT public.is_admin() as is_admin;`);
  if (nullAdminRes.rows[0].is_admin === false) {
    console.log("   [OK] is_admin() returns FALSE when not authenticated (no JWT sub)");
  } else {
    throw new Error("is_admin() should return false when not authenticated");
  }

  // Regular authenticated user
  await db.exec(`SET "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000099';`);
  const regAdminRes = await db.query(`SELECT public.is_admin() as is_admin;`);
  if (regAdminRes.rows[0].is_admin === false) {
    console.log("   [OK] is_admin() returns FALSE for regular authenticated student");
  } else {
    throw new Error("is_admin() should return false for regular authenticated user");
  }

  // Regular user querying admins table
  const regAdminQuery = await db.query(`SELECT * FROM admins;`);
  if (regAdminQuery.rows.length === 0) {
    console.log("   [OK] Regular authenticated user receives 0 rows from admins table");
  } else {
    throw new Error("Regular authenticated user should not see admin rows");
  }

  // Active Admin user
  await db.exec(`SET "request.jwt.claim.sub" = '${adminUser}';`);
  const trueAdminRes = await db.query(`SELECT public.is_admin() as is_admin;`);
  if (trueAdminRes.rows[0].is_admin === true) {
    console.log("   [OK] is_admin() returns TRUE for active admin");
  } else {
    throw new Error("is_admin() should return true for active admin");
  }

  // Test admin query on admins table with RLS - verifies no recursion!
  const adminRosterQuery = await db.query(`SELECT * FROM admins;`);
  if (adminRosterQuery.rows.length === 1 && adminRosterQuery.rows[0].id === adminUser) {
    console.log("   [OK] Active admin successfully views admins roster without RLS recursion.");
  } else {
    throw new Error("Active admin failed to read admins roster");
  }

  // Reset role
  await db.exec(`RESET ROLE;`);
  console.log("\n=== ALL VALIDATION CHECKS PASSED SUCCESSFULLY ===");
}

runValidation().catch((err) => {
  console.error("\n[FATAL VALIDATION ERROR]:", err);
  process.exit(1);
});