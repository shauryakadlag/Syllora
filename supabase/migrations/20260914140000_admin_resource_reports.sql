-- Migration: 20260914140000_admin_resource_reports.sql
-- Description: Adds report lifecycle status, resolution metadata (resolved_at, resolved_by),
-- integrity check constraints, indices, and admin UPDATE RLS policy for Phase 8B.

-- 1. Create report_status enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE public.report_status AS ENUM ('open', 'resolved', 'dismissed');
    END IF;
END $$;

-- 2. Add lifecycle status and resolution columns
ALTER TABLE public.resource_reports
    ADD COLUMN IF NOT EXISTS status public.report_status NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.admins(id) ON DELETE SET NULL;

-- 3. Add integrity check constraint for report resolution state
-- - 'open' reports must have NULL resolution fields
-- - 'resolved' and 'dismissed' reports must have populated resolution timestamp and admin ID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_resource_reports_resolution'
    ) THEN
        ALTER TABLE public.resource_reports
            ADD CONSTRAINT chk_resource_reports_resolution
            CHECK (
                (status = 'open' AND resolved_at IS NULL AND resolved_by IS NULL)
                OR
                (status IN ('resolved', 'dismissed') AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL)
            );
    END IF;
END $$;

-- 4. Create indices for admin listing, filtering, and foreign key traversal
CREATE INDEX IF NOT EXISTS idx_resource_reports_status ON public.resource_reports(status);
CREATE INDEX IF NOT EXISTS idx_resource_reports_status_created_at ON public.resource_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_reports_resolved_by ON public.resource_reports(resolved_by);

-- 5. Administrator UPDATE Policy
-- Active administrators can resolve or dismiss resource reports.
DROP POLICY IF EXISTS "Admins update resource reports" ON public.resource_reports;
CREATE POLICY "Admins update resource reports" ON public.resource_reports
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));
