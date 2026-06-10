-- 1. Create a function to generate the Daily Challenge safely
CREATE OR REPLACE FUNCTION public.generate_daily_potd()
RETURNS void AS $$
DECLARE
    today_date DATE := timezone('utc'::text, now())::date;
    selected_problem_id UUID;
BEGIN
    -- Check if a POTD already exists for today
    IF EXISTS (SELECT 1 FROM public.daily_challenges WHERE date = today_date) THEN
        RETURN; -- Already generated, do nothing
    END IF;

    -- Select a random problem that HAS NOT been used in the last 30 days
    -- This ensures users don't get the same problem repeatedly
    SELECT id INTO selected_problem_id
    FROM public.coding_problems
    WHERE id NOT IN (
        SELECT problem_id 
        FROM public.daily_challenges 
        WHERE date >= today_date - INTERVAL '30 days'
    )
    ORDER BY random()
    LIMIT 1;

    -- Fallback: If we somehow exhausted all problems in 30 days (small database),
    -- just pick any random problem.
    IF selected_problem_id IS NULL THEN
        SELECT id INTO selected_problem_id
        FROM public.coding_problems
        ORDER BY random()
        LIMIT 1;
    END IF;

    -- Insert the selected problem
    IF selected_problem_id IS NOT NULL THEN
        INSERT INTO public.daily_challenges (date, problem_id)
        VALUES (today_date, selected_problem_id)
        ON CONFLICT (date) DO NOTHING; -- Safe against race conditions
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Expose the function via PostgREST so it can be called via supabase.rpc() if needed
GRANT EXECUTE ON FUNCTION public.generate_daily_potd TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_potd TO anon;
GRANT EXECUTE ON FUNCTION public.generate_daily_potd TO service_role;

-- 3. (Optional but Recommended) Schedule it using pg_cron if your Supabase project supports it
-- Ensure pg_cron extension is enabled in your database extensions.
-- Run the following line as a superuser (postgres user) in the Supabase SQL Editor:
-- SELECT cron.schedule('generate-potd-midnight', '59 23 * * *', 'SELECT public.generate_daily_potd()');
