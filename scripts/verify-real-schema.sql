-- Check all 11 tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check all 3 enums
SELECT typname, array_agg(enumlabel ORDER BY enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('resource_status', 'resource_type', 'publish_status')
GROUP BY typname
ORDER BY typname;

-- Check custom indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- Check RLS enabled on all tables
SELECT relname as table_name, relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY relname;

-- Check all RLS policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check is_admin function and SECURITY DEFINER
SELECT 
    p.proname, 
    p.prosecdef as is_security_definer,
    p.proconfig as search_path_config,
    pg_get_functiondef(p.oid) as function_def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'is_admin';
