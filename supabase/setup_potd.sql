-- 1. Create the daily_challenges table
CREATE TABLE IF NOT EXISTS public.daily_challenges (
    date DATE PRIMARY KEY,
    problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for daily_challenges
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.daily_challenges FOR SELECT USING (true);
CREATE POLICY "Enable insert access for service role only" ON public.daily_challenges FOR INSERT WITH CHECK (true);

-- 2. Create the potd_completions table
CREATE TABLE IF NOT EXISTS public.potd_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date)
);

-- Enable RLS for potd_completions
ALTER TABLE public.potd_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable insert for authenticated users" ON public.potd_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable read for authenticated users" ON public.potd_completions FOR SELECT USING (auth.uid() = user_id);

-- 3. Add streak columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_potd_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_potd_streak INTEGER DEFAULT 0;
