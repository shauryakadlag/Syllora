-- Migration: 20260914150000_student_topic_progress.sql
-- Description: Create student_topic_progress table for tracking learning topic completion
-- with Row Level Security (RLS) enforcing strict student-only ownership and published topic constraint.

CREATE TABLE IF NOT EXISTS public.student_topic_progress (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.learning_topics(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, topic_id)
);

-- Indices for efficient user and topic progress lookups
CREATE INDEX IF NOT EXISTS idx_student_topic_progress_user_id ON public.student_topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_student_topic_progress_topic_id ON public.student_topic_progress(topic_id);

-- Enable Row Level Security
ALTER TABLE public.student_topic_progress ENABLE ROW LEVEL SECURITY;

-- 1. Student SELECT Policy: Students can only view their own progress
DROP POLICY IF EXISTS "Students view own progress" ON public.student_topic_progress;
CREATE POLICY "Students view own progress" ON public.student_topic_progress
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 2. Student INSERT Policy: Students can only mark their own progress, and only for published topics
DROP POLICY IF EXISTS "Students insert own progress" ON public.student_topic_progress;
CREATE POLICY "Students insert own progress" ON public.student_topic_progress
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.learning_topics lt
            WHERE lt.id = student_topic_progress.topic_id
              AND lt.status = 'published'::public.publish_status
        )
    );

-- 3. Student DELETE Policy: Students can only delete/undo their own progress
DROP POLICY IF EXISTS "Students delete own progress" ON public.student_topic_progress;
CREATE POLICY "Students delete own progress" ON public.student_topic_progress
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
