-- Migration: 20260914120000_admin_topic_resources_mutation_policies.sql
-- Description: Allow active administrators to insert and delete topic_resources links under Row Level Security.
-- Public/anon and non-admin authenticated users have ZERO mutation rights.

DROP POLICY IF EXISTS "Admins insert topic_resources" ON public.topic_resources;
CREATE POLICY "Admins insert topic_resources" ON public.topic_resources
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins delete topic_resources" ON public.topic_resources;
CREATE POLICY "Admins delete topic_resources" ON public.topic_resources
    FOR DELETE TO authenticated
    USING ((SELECT public.is_admin()));
