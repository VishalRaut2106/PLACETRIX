-- =============================================================================
-- MIGRATION: Add `rsvp_at` and `marked_present_at` columns to `public.event_tickets`
-- =============================================================================

-- 1. Safely add columns if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'event_tickets' 
          AND column_name = 'rsvp_at'
    ) THEN
        ALTER TABLE public.event_tickets ADD COLUMN rsvp_at TIMESTAMPTZ DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'event_tickets' 
          AND column_name = 'marked_present_at'
    ) THEN
        ALTER TABLE public.event_tickets ADD COLUMN marked_present_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Backfill existing records:
--    a) Set rsvp_at = created_at for all records where rsvp_at IS NULL
UPDATE public.event_tickets 
SET rsvp_at = created_at 
WHERE rsvp_at IS NULL;

--    b) Set marked_present_at = updated_at for records where attendance_status = 'Present' and marked_present_at IS NULL
UPDATE public.event_tickets 
SET marked_present_at = updated_at 
WHERE attendance_status = 'Present' 
  AND marked_present_at IS NULL;

-- 3. Documentation comments
COMMENT ON COLUMN public.event_tickets.rsvp_at IS 'Timestamp when candidate registered or RSVPed for the event.';
COMMENT ON COLUMN public.event_tickets.marked_present_at IS 'Timestamp when candidate was marked present at the event.';
