-- Migration: 20260914130000_student_resource_reporting.sql
-- Description: Create resource_reports table with RLS policies allowing anonymous students
-- to submit reports for verified resources, while restricting read/manage access to active admins.

CREATE TABLE IF NOT EXISTS public.resource_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('broken', 'misleading', 'irrelevant', 'other')),
    description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for efficient query lookups and admin sorting
CREATE INDEX IF NOT EXISTS idx_resource_reports_resource_id ON public.resource_reports(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_reports_created_at ON public.resource_reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.resource_reports ENABLE ROW LEVEL SECURITY;

-- 1. Public/Anonymous INSERT Policy
-- Allows anyone (anonymous or authenticated student) to submit a report,
-- BUT strictly enforces that the target resource exists and is verified.
DROP POLICY IF EXISTS "Public submit resource report" ON public.resource_reports;
CREATE POLICY "Public submit resource report" ON public.resource_reports
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.resources r
            WHERE r.id = resource_reports.resource_id
              AND r.status = 'verified'::public.resource_status
        )
    );

-- 2. Administrator SELECT Policy
-- Active administrators can inspect all submitted reports.
DROP POLICY IF EXISTS "Admins view resource reports" ON public.resource_reports;
CREATE POLICY "Admins view resource reports" ON public.resource_reports
    FOR SELECT TO authenticated
    USING ((SELECT public.is_admin()));

-- 3. Administrator DELETE Policy
-- Active administrators can resolve/delete reports.
DROP POLICY IF EXISTS "Admins delete resource reports" ON public.resource_reports;
CREATE POLICY "Admins delete resource reports" ON public.resource_reports
    FOR DELETE TO authenticated
    USING ((SELECT public.is_admin()));
