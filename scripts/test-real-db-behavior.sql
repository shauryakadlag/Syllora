CREATE TEMP TABLE IF NOT EXISTS test_results (
    test_name TEXT PRIMARY KEY,
    status TEXT,
    details TEXT
);
GRANT ALL ON test_results TO anon, authenticated;
DELETE FROM test_results;

DO $test_suite$
DECLARE
    v_univ_id UUID;
    v_pattern_id UUID;
    v_branch_id UUID;
    v_sem_id UUID;
    v_sub_id UUID;
    v_unit_id UUID;
    v_syl_id UUID;
    v_topic_pub_id UUID;
    v_topic_draft_id UUID;
    v_res_ver_id UUID;
    v_res_pend_id UUID;
    v_admin_user_id UUID := '11111111-1111-1111-1111-111111111111';
    v_regular_user_id UUID := '22222222-2222-2222-2222-222222222222';
    v_count INT;
    v_err_caught BOOLEAN;
BEGIN
    -- -------------------------------------------------------------------------
    -- 1. CONSTRAINT TESTS
    -- -------------------------------------------------------------------------

    -- 1a. Insert valid University & Pattern & Branch
    INSERT INTO universities (name, acronym) 
    VALUES ('Temp Test University', 'TTU') 
    RETURNING id INTO v_univ_id;

    INSERT INTO patterns (university_id, year_name)
    VALUES (v_univ_id, '2024 Test Pattern')
    RETURNING id INTO v_pattern_id;

    INSERT INTO branches (pattern_id, name)
    VALUES (v_pattern_id, 'Computer Engineering')
    RETURNING id INTO v_branch_id;

    -- 1b. Test semester_number check constraint (valid 1-8, invalid 9)
    v_err_caught := false;
    BEGIN
        INSERT INTO semesters (branch_id, semester_number) VALUES (v_branch_id, 9);
    EXCEPTION WHEN check_violation THEN
        v_err_caught := true;
    END;
    IF v_err_caught THEN
        INSERT INTO test_results VALUES ('constraint_semester_check', 'PASS', 'Semester number 9 rejected by check constraint');
    ELSE
        INSERT INTO test_results VALUES ('constraint_semester_check', 'FAIL', 'Semester number 9 was accepted');
    END IF;

    -- 1c. Test duplicate university acronym unique constraint
    v_err_caught := false;
    BEGIN
        INSERT INTO universities (name, acronym) VALUES ('Duplicate University', 'TTU');
    EXCEPTION WHEN unique_violation THEN
        v_err_caught := true;
    END;
    IF v_err_caught THEN
        INSERT INTO test_results VALUES ('constraint_university_acronym_unique', 'PASS', 'Duplicate acronym TTU rejected');
    ELSE
        INSERT INTO test_results VALUES ('constraint_university_acronym_unique', 'FAIL', 'Duplicate acronym TTU was accepted');
    END IF;

    -- 1d. Test duplicate hierarchy (same branch_id + semester_number)
    INSERT INTO semesters (branch_id, semester_number) VALUES (v_branch_id, 3) RETURNING id INTO v_sem_id;
    v_err_caught := false;
    BEGIN
        INSERT INTO semesters (branch_id, semester_number) VALUES (v_branch_id, 3);
    EXCEPTION WHEN unique_violation THEN
        v_err_caught := true;
    END;
    IF v_err_caught THEN
        INSERT INTO test_results VALUES ('constraint_duplicate_hierarchy_unique', 'PASS', 'Duplicate semester 3 for same branch rejected');
    ELSE
        INSERT INTO test_results VALUES ('constraint_duplicate_hierarchy_unique', 'FAIL', 'Duplicate semester 3 accepted');
    END IF;

    -- Insert rest of academic hierarchy
    INSERT INTO subjects (semester_id, course_code, subject_name)
    VALUES (v_sem_id, 'CS201', 'Data Structures')
    RETURNING id INTO v_sub_id;

    INSERT INTO units (subject_id, unit_number, unit_order, unit_name)
    VALUES (v_sub_id, 'Unit I', 1, 'Introduction')
    RETURNING id INTO v_unit_id;

    INSERT INTO syllabus_items (unit_id, official_text, original_order)
    VALUES (v_unit_id, 'Abstract Data Types', 1)
    RETURNING id INTO v_syl_id;

    -- Setup admin in auth.users and admins
    INSERT INTO auth.users (id, email) VALUES (v_admin_user_id, 'temp_admin@syllora.test')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO admins (id, role, is_active)
    VALUES (v_admin_user_id, 'admin', true)
    ON CONFLICT (id) DO UPDATE SET is_active = true;

    -- 1e. Test verified resource without verification fields rejected
    v_err_caught := false;
    BEGIN
        INSERT INTO resources (title, url, type, status)
        VALUES ('Bad Verified Video', 'https://example.com/bad', 'video', 'verified');
    EXCEPTION WHEN check_violation THEN
        v_err_caught := true;
    END;
    IF v_err_caught THEN
        INSERT INTO test_results VALUES ('constraint_resource_accountability', 'PASS', 'Verified resource without verified_by/at rejected');
    ELSE
        INSERT INTO test_results VALUES ('constraint_resource_accountability', 'FAIL', 'Verified resource without verified_by/at accepted');
    END IF;

    -- 1f. Valid verified resource accepted
    INSERT INTO resources (title, url, type, status, verified_by, verified_at)
    VALUES ('Good Verified Video', 'https://example.com/good_video', 'video', 'verified', v_admin_user_id, NOW())
    RETURNING id INTO v_res_ver_id;
    INSERT INTO test_results VALUES ('valid_verified_resource', 'PASS', 'Verified resource with valid admin audit trail accepted');

    -- Insert pending resource
    INSERT INTO resources (title, url, type, status)
    VALUES ('Pending Notes', 'https://example.com/pending_notes', 'article', 'pending')
    RETURNING id INTO v_res_pend_id;

    -- 1g. Test ON DELETE RESTRICT on admins when referenced in resources
    v_err_caught := false;
    BEGIN
        DELETE FROM admins WHERE id = v_admin_user_id;
    EXCEPTION WHEN foreign_key_violation THEN
        v_err_caught := true;
    END;
    IF v_err_caught THEN
        INSERT INTO test_results VALUES ('constraint_admin_delete_restrict', 'PASS', 'ON DELETE RESTRICT prevented deleting admin with verified resources');
    ELSE
        INSERT INTO test_results VALUES ('constraint_admin_delete_restrict', 'FAIL', 'Admin was deleted despite referenced by verified resource');
    END IF;

    -- Insert learning topics: 1 published, 1 draft
    INSERT INTO learning_topics (syllabus_item_id, normalized_title, status)
    VALUES (v_syl_id, 'Published Topic', 'published')
    RETURNING id INTO v_topic_pub_id;

    INSERT INTO learning_topics (syllabus_item_id, normalized_title, status)
    VALUES (v_syl_id, 'Draft Topic', 'draft')
    RETURNING id INTO v_topic_draft_id;

    -- Insert topic_resources:
    -- Valid pair: Published topic + Verified resource
    INSERT INTO topic_resources (learning_topic_id, resource_id) VALUES (v_topic_pub_id, v_res_ver_id);
    -- Invalid pairs (should be hidden by RLS):
    INSERT INTO topic_resources (learning_topic_id, resource_id) VALUES (v_topic_pub_id, v_res_pend_id);
    INSERT INTO topic_resources (learning_topic_id, resource_id) VALUES (v_topic_draft_id, v_res_ver_id);
    INSERT INTO topic_resources (learning_topic_id, resource_id) VALUES (v_topic_draft_id, v_res_pend_id);

    INSERT INTO test_results VALUES ('test_data_setup', 'PASS', 'Test dataset created successfully');
END
$test_suite$;

-- -----------------------------------------------------------------------------
-- 2. RLS TESTS AS ANONYMOUS ROLE
-- -----------------------------------------------------------------------------
SET ROLE anon;

-- 2a. Can anon read official curriculum?
DO $$
DECLARE
    v_c INT;
BEGIN
    SELECT count(*) INTO v_c FROM universities WHERE acronym = 'TTU';
    IF v_c = 1 THEN
        INSERT INTO test_results VALUES ('rls_anon_read_official_curriculum', 'PASS', 'Anon successfully reads official curriculum');
    ELSE
        INSERT INTO test_results VALUES ('rls_anon_read_official_curriculum', 'FAIL', 'Anon could not read universities');
    END IF;
END $$;

-- 2b. Can anon see ONLY published topics?
DO $$
DECLARE
    v_has_draft INT;
    v_has_pub INT;
BEGIN
    SELECT count(*) INTO v_has_draft FROM learning_topics WHERE normalized_title = 'Draft Topic';
    SELECT count(*) INTO v_has_pub FROM learning_topics WHERE normalized_title = 'Published Topic';
    IF v_has_draft = 0 AND v_has_pub = 1 THEN
        INSERT INTO test_results VALUES ('rls_anon_read_topics_published_only', 'PASS', 'Anon reads ONLY published topics (drafts hidden)');
    ELSE
        INSERT INTO test_results VALUES ('rls_anon_read_topics_published_only', 'FAIL', 'Draft topic leaked or published missing');
    END IF;
END $$;

-- 2c. Can anon see ONLY verified resources?
DO $$
DECLARE
    v_has_pend INT;
    v_has_ver INT;
BEGIN
    SELECT count(*) INTO v_has_pend FROM resources WHERE url = 'https://example.com/pending_notes';
    SELECT count(*) INTO v_has_ver FROM resources WHERE url = 'https://example.com/good_video';
    IF v_has_pend = 0 AND v_has_ver = 1 THEN
        INSERT INTO test_results VALUES ('rls_anon_read_resources_verified_only', 'PASS', 'Anon reads ONLY verified resources (pending hidden)');
    ELSE
        INSERT INTO test_results VALUES ('rls_anon_read_resources_verified_only', 'FAIL', 'Pending resource leaked or verified missing');
    END IF;
END $$;

-- 2d. Can anon see ONLY valid topic_resources (published + verified)?
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT count(*) INTO v_count 
    FROM topic_resources tr
    JOIN learning_topics lt ON lt.id = tr.learning_topic_id
    WHERE lt.normalized_title IN ('Published Topic', 'Draft Topic');
    
    IF v_count = 1 THEN
        INSERT INTO test_results VALUES ('rls_anon_read_topic_resources', 'PASS', 'Anon reads ONLY 1 valid pair (pub topic + ver res)');
    ELSE
        INSERT INTO test_results VALUES ('rls_anon_read_topic_resources', 'FAIL', 'Incorrect topic_resources count: ' || v_count);
    END IF;
END $$;

-- 2e. Anon CANNOT read admins roster
DO $$
DECLARE
    v_admin_count INT;
BEGIN
    SELECT count(*) INTO v_admin_count FROM admins;
    IF v_admin_count = 0 THEN
        INSERT INTO test_results VALUES ('rls_anon_read_admins_blocked', 'PASS', 'Anon cannot view admins roster (0 rows returned)');
    ELSE
        INSERT INTO test_results VALUES ('rls_anon_read_admins_blocked', 'FAIL', 'Admins roster leaked to anon!');
    END IF;
END $$;

-- 2f. Anon CANNOT INSERT into universities
DO $$
DECLARE
    v_err BOOLEAN := false;
BEGIN
    BEGIN
        INSERT INTO universities (name, acronym) VALUES ('Hacked Univ', 'HACK');
    EXCEPTION WHEN insufficient_privilege THEN
        v_err := true;
    END;
    IF v_err THEN
        INSERT INTO test_results VALUES ('rls_anon_insert_blocked', 'PASS', 'Anon INSERT blocked');
    ELSE
        INSERT INTO test_results VALUES ('rls_anon_insert_blocked', 'FAIL', 'Anon was able to INSERT');
    END IF;
END $$;

-- 2g. Anon CANNOT UPDATE universities (RLS denies write -> 0 rows updated)
DO $$
DECLARE
    v_rows INT;
BEGIN
    UPDATE universities SET name = 'Modified' WHERE acronym = 'TTU';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        INSERT INTO test_results VALUES ('rls_anon_update_blocked', 'PASS', 'Anon UPDATE blocked by RLS (0 rows updated)');
    ELSE
        INSERT INTO test_results VALUES ('rls_anon_update_blocked', 'FAIL', 'Anon was able to UPDATE rows!');
    END IF;
END $$;

-- 2h. Anon CANNOT DELETE universities (RLS denies write -> 0 rows deleted)
DO $$
DECLARE
    v_rows INT;
BEGIN
    DELETE FROM universities WHERE acronym = 'TTU';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        INSERT INTO test_results VALUES ('rls_anon_delete_blocked', 'PASS', 'Anon DELETE blocked by RLS (0 rows deleted)');
    ELSE
        INSERT INTO test_results VALUES ('rls_anon_delete_blocked', 'FAIL', 'Anon was able to DELETE rows!');
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. RLS TESTS AS AUTHENTICATED NON-ADMIN
-- -----------------------------------------------------------------------------
SET ROLE authenticated;
SET "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

-- 3a. Authenticated non-admin cannot view admins roster
DO $$
DECLARE
    v_admin_count INT;
BEGIN
    SELECT count(*) INTO v_admin_count FROM admins;
    IF v_admin_count = 0 THEN
        INSERT INTO test_results VALUES ('rls_authenticated_non_admin_roster_blocked', 'PASS', 'Non-admin receives 0 rows from admins table');
    ELSE
        INSERT INTO test_results VALUES ('rls_authenticated_non_admin_roster_blocked', 'FAIL', 'Admin roster leaked to regular user');
    END IF;
END $$;

-- 3b. Authenticated non-admin cannot INSERT into learning_topics
DO $$
DECLARE
    v_err BOOLEAN := false;
BEGIN
    BEGIN
        INSERT INTO learning_topics (syllabus_item_id, normalized_title) 
        SELECT id, 'Illegal Topic' FROM syllabus_items LIMIT 1;
    EXCEPTION WHEN insufficient_privilege THEN
        v_err := true;
    END;
    IF v_err THEN
        INSERT INTO test_results VALUES ('rls_authenticated_insert_blocked', 'PASS', 'Authenticated non-admin INSERT blocked');
    ELSE
        INSERT INTO test_results VALUES ('rls_authenticated_insert_blocked', 'FAIL', 'Authenticated non-admin was able to INSERT');
    END IF;
END $$;

-- 3c. Authenticated non-admin cannot UPDATE learning_topics (0 rows updated)
DO $$
DECLARE
    v_rows INT;
BEGIN
    UPDATE learning_topics SET normalized_title = 'Tampered' WHERE normalized_title = 'Published Topic';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        INSERT INTO test_results VALUES ('rls_authenticated_update_blocked', 'PASS', 'Authenticated non-admin UPDATE blocked by RLS (0 rows updated)');
    ELSE
        INSERT INTO test_results VALUES ('rls_authenticated_update_blocked', 'FAIL', 'Authenticated non-admin was able to UPDATE rows!');
    END IF;
END $$;

-- 3d. Authenticated non-admin cannot DELETE learning_topics (0 rows deleted)
DO $$
DECLARE
    v_rows INT;
BEGIN
    DELETE FROM learning_topics WHERE normalized_title = 'Published Topic';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        INSERT INTO test_results VALUES ('rls_authenticated_delete_blocked', 'PASS', 'Authenticated non-admin DELETE blocked by RLS (0 rows deleted)');
    ELSE
        INSERT INTO test_results VALUES ('rls_authenticated_delete_blocked', 'FAIL', 'Authenticated non-admin was able to DELETE rows!');
    END IF;
END $$;

-- 3e. is_admin() returns false for regular authenticated user
DO $$
BEGIN
    IF public.is_admin() = false THEN
        INSERT INTO test_results VALUES ('is_admin_non_admin', 'PASS', 'is_admin() returned FALSE for regular authenticated user');
    ELSE
        INSERT INTO test_results VALUES ('is_admin_non_admin', 'FAIL', 'is_admin() returned TRUE for regular user');
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. ACTIVE ADMIN TESTS & RECURSION CHECK
-- -----------------------------------------------------------------------------
SET ROLE authenticated;
SET "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
    v_admin_count INT;
BEGIN
    IF public.is_admin() = true THEN
        INSERT INTO test_results VALUES ('is_admin_active_admin', 'PASS', 'is_admin() returned TRUE for active admin');
    ELSE
        INSERT INTO test_results VALUES ('is_admin_active_admin', 'FAIL', 'is_admin() returned FALSE for active admin');
    END IF;

    -- Query admins table as admin (verifies no recursion)
    SELECT count(*) INTO v_admin_count FROM admins;
    IF v_admin_count >= 1 THEN
        INSERT INTO test_results VALUES ('admin_roster_access_no_recursion', 'PASS', 'Active admin successfully viewed admins roster with 0 recursion');
    ELSE
        INSERT INTO test_results VALUES ('admin_roster_access_no_recursion', 'FAIL', 'Admin could not view admins roster');
    END IF;
END $$;

-- Reset role to postgres for cleanup
RESET ROLE;
SET "request.jwt.claim.sub" = '';

-- -----------------------------------------------------------------------------
-- 5. CLEANUP TEMPORARY TEST DATA (LEAVES ZERO RESIDUAL ROWS)
-- -----------------------------------------------------------------------------
DELETE FROM resources WHERE url IN ('https://example.com/good_video', 'https://example.com/pending_notes');
DELETE FROM universities WHERE acronym = 'TTU';
DELETE FROM admins WHERE id = '11111111-1111-1111-1111-111111111111';
DELETE FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111';

-- Return all test results as JSON
SELECT json_agg(json_build_object('test', test_name, 'status', status, 'details', details)) as test_report
FROM test_results;