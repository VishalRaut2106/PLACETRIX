-- =============================================================================
-- FOOLPROOF MIGRATION: Add `marks_available` column to `public.tests`
-- =============================================================================

-- 1. Safely add column if it does not exist (default to FALSE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tests' 
          AND column_name = 'marks_available'
    ) THEN
        ALTER TABLE public.tests ADD COLUMN marks_available BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- 2. Backfill existing tests: If results are already released (results_available = TRUE),
--    auto-release marks so existing candidates do not lose access to their scores.
UPDATE public.tests 
SET marks_available = TRUE 
WHERE results_available = TRUE;

-- 3. Add explicit documentation comment to database schema
COMMENT ON COLUMN public.tests.marks_available IS 'Controls candidate visibility of score and marks. Independent from results_available (detailed answer key/analysis).';
