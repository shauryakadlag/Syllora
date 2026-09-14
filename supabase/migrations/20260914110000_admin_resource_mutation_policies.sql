-- Migration: 20260914110000_admin_resource_mutation_policies.sql
-- Description: Allow active administrators to insert and update resources under Row Level Security.
-- Public/anon and non-admin authenticated users have ZERO mutation rights.

DROP POLICY IF EXISTS "Admins insert resources" ON public.resources;
CREATE POLICY "Admins insert resources" ON public.resources
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins update resources" ON public.resources;
CREATE POLICY "Admins update resources" ON public.resources
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));
