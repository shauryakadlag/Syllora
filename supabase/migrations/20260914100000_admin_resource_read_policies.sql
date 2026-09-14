-- Migration: 20260914100000_admin_resource_read_policies.sql
-- Description: Allow active administrators to read all resources, topic_resources, and learning_topics under RLS.
-- Anonymous and non-admin authenticated users remain strictly scoped to verified resources and published topics.

DROP POLICY IF EXISTS "Admins view all resources" ON public.resources;
CREATE POLICY "Admins view all resources" ON public.resources
    FOR SELECT TO authenticated
    USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins view all topic_resources" ON public.topic_resources;
CREATE POLICY "Admins view all topic_resources" ON public.topic_resources
    FOR SELECT TO authenticated
    USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins view all learning_topics" ON public.learning_topics;
CREATE POLICY "Admins view all learning_topics" ON public.learning_topics
    FOR SELECT TO authenticated
    USING ((SELECT public.is_admin()));
