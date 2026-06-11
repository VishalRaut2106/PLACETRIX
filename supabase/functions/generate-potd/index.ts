// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase Client with Service Role Key for full admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Ensure this request is authorized if called manually (can use a CRON_SECRET)
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine the date to generate POTD for (Today in UTC)
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    // 1. Check if POTD already exists for today
    const { data: existingPotd } = await supabaseClient
      .from('daily_challenges')
      .select('problem_id')
      .eq('date', todayStr)
      .single()

    if (existingPotd) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'POTD already exists for today.', 
        problem_id: existingPotd.problem_id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch recent POTDs to avoid picking them again (e.g., last 30 days)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setUTCDate(today.getUTCDate() - 30)
    
    const { data: recentPotds } = await supabaseClient
      .from('daily_challenges')
      .select('problem_id')
      .gte('date', thirtyDaysAgo.toISOString().split("T")[0])

    const recentProblemIds = recentPotds?.map(p => p.problem_id) || []

    // 3. Fetch a random problem that is NOT in the recent POTDs list
    // We can fetch all IDs and pick a random one in memory if the table isn't gigantic,
    // or use a Postgres function. We'll fetch all active problem IDs and filter.
    const { data: allProblems, error: fetchErr } = await supabaseClient
      .from('coding_problems')
      .select('id')
      // You could add .eq('is_published', true) if you have such a column

    if (fetchErr || !allProblems || allProblems.length === 0) {
      throw new Error('Could not fetch coding problems or no problems available.')
    }

    // Filter out recently used ones
    const availableProblems = allProblems.filter(p => !recentProblemIds.includes(p.id))

    // Fallback: If we somehow used all problems in the last 30 days, just pick from all problems
    const poolToPickFrom = availableProblems.length > 0 ? availableProblems : allProblems

    // Pick a random problem
    const randomIndex = Math.floor(Math.random() * poolToPickFrom.length)
    const selectedProblemId = poolToPickFrom[randomIndex].id

    // 4. Insert into daily_challenges
    const { error: insertErr } = await supabaseClient
      .from('daily_challenges')
      .insert({
        date: todayStr,
        problem_id: selectedProblemId
      })

    if (insertErr) throw insertErr

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'New POTD generated successfully.',
      date: todayStr,
      problem_id: selectedProblemId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
