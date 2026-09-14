-- ==========================================
-- 1. EXTENSIONS & ENUMS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE resource_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE resource_type AS ENUM ('video', 'article', 'pdf', 'playlist', 'documentation');
CREATE TYPE publish_status AS ENUM ('draft', 'published');

-- ==========================================
-- 2. CORE ACADEMIC HIERARCHY (OFFICIAL)
-- ==========================================
CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    acronym TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    year_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(university_id, year_name)
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pattern_id, name)
);

CREATE TABLE semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, semester_number)
);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(semester_id, course_code)
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL, 
    unit_order INTEGER NOT NULL, 
    unit_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, unit_number),
    UNIQUE(subject_id, unit_order)
);

CREATE TABLE syllabus_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    official_text TEXT NOT NULL,
    original_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, original_order)
);

-- ==========================================
-- 3. ADMIN LAYER
-- ==========================================
CREATE TABLE admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('admin', 'moderator')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper function to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins 
        WHERE id = auth.uid() AND is_active = true
    );
$$;

-- ==========================================
-- 4. SYLLORA PLATFORM LAYER (DERIVED)
-- ==========================================
CREATE TABLE learning_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    syllabus_item_id UUID NOT NULL REFERENCES syllabus_items(id) ON DELETE CASCADE,
    normalized_title TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    status publish_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    type resource_type NOT NULL,
    provider TEXT, 
    description TEXT,
    status resource_status DEFAULT 'pending',
    verified_by UUID REFERENCES admins(id) ON DELETE RESTRICT, -- FIXED: RESTRICT to prevent constraint collision
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Enforce accountability trail for verified resources
    CHECK (
        (status != 'verified') OR 
        (status = 'verified' AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
    )
);

CREATE TABLE topic_resources (
    learning_topic_id UUID NOT NULL REFERENCES learning_topics(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    ranking_score INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (learning_topic_id, resource_id)
);

-- ==========================================
-- 5. INDEXING
-- ==========================================
CREATE INDEX idx_patterns_university ON patterns(university_id);
CREATE INDEX idx_branches_pattern ON branches(pattern_id);
CREATE INDEX idx_semesters_branch ON semesters(branch_id);
CREATE INDEX idx_subjects_semester ON subjects(semester_id);
CREATE INDEX idx_units_subject ON units(subject_id);
CREATE INDEX idx_syllabus_items_unit ON syllabus_items(unit_id);
CREATE INDEX idx_learning_topics_syllabus ON learning_topics(syllabus_item_id);
CREATE INDEX idx_learning_topics_status ON learning_topics(status);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_topic_resources_resource ON topic_resources(resource_id);

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Public Read Access for Official Curriculum (Scoped to anon, authenticated)
CREATE POLICY "Public view universities" ON universities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public view patterns" ON patterns FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public view branches" ON branches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public view semesters" ON semesters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public view subjects" ON subjects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public view units" ON units FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public view syllabus_items" ON syllabus_items FOR SELECT TO anon, authenticated USING (true);

-- Curated/Protected Reads for Derived Layer
CREATE POLICY "Public view published topics" ON learning_topics 
    FOR SELECT TO anon, authenticated 
    USING (status = 'published');

CREATE POLICY "Public view verified resources" ON resources 
    FOR SELECT TO anon, authenticated 
    USING (status = 'verified');

CREATE POLICY "Public view topic_resources" ON topic_resources 
    FOR SELECT TO anon, authenticated 
    USING (
        EXISTS (SELECT 1 FROM public.resources WHERE id = topic_resources.resource_id AND status = 'verified')
        AND EXISTS (SELECT 1 FROM public.learning_topics WHERE id = topic_resources.learning_topic_id AND status = 'published')
    );

-- Secure Admin Read (Cached via SELECT wrapper)
CREATE POLICY "Admins view admins roster" ON admins 
    FOR SELECT USING ((SELECT public.is_admin()));