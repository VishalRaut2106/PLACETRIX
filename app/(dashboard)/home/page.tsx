import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { RecentSupportTickets } from "./RecentSupportTickets";
import { CandidateDashboardClient } from "./_components/CandidateDashboardClient";
import { LicenseBanner } from "@/components/license/LicenseBanner";
import { getCachedPotd } from "../(licensed)/logiclab/actions";
import {
  ArrowRight,
  BookOpen,
  PlayCircle,
  CalendarClock,
  CheckCircle2,
  Users,
  ListCheck,
  PenLine,
} from "lucide-react";


// ─── Types ───────────────────────────────────────────────────────────────────

interface CandidateStatsResponse {
  profile: any;
  stats: {
    total_tests: number;
    live_tests: number;
    upcoming_tests: number;
    completed_tests: number;
  };
}

interface InstituteStatsResponse {
  profile: any;
  stats: {
    total_tests: number;
    live_tests: number;
    upcoming_tests: number;
    past_tests: number;
    draft_tests: number;
    total_attempts: number;
  };
}


// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: "green" | "amber" | "blue" | "muted";
}) {
  const accentClass =
    accent === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : accent === "blue"
          ? "text-blue-600 dark:text-blue-400"
          : "text-foreground";

  const accentBg =
    accent === "green"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : accent === "amber"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : accent === "blue"
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "bg-muted/40 text-muted-foreground";

  return (
    <div className="group rounded-2xl border border-border/40 bg-card p-5 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 ${accentBg}`}>
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-extrabold tabular-nums tracking-tight leading-none mt-1 ${accentClass}`}>
        {value}
      </p>
    </div>
  );
}


// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <Link
        href={href}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        View all
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const supabase = await createClient();

  // ── Candidate ──────────────────────────────────────────────────────────────
  if (profile.account_type === "institute_candidate") {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const yesterdayDate = new Date(today.getTime() - (24 * 60 * 60 * 1000));
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    const cutOffDate20Weeks = new Date(today.getTime() - (140 * 24 * 60 * 60 * 1000));
    const cutOffStr20Weeks = cutOffDate20Weeks.toISOString().split("T")[0];

    // Fetch stats, attempts, global stats, and daily challenge activity in parallel
    const [homeStatsRes, testAttemptsRes, statsRes, allActivityRes] = await Promise.all([
      (supabase as any).rpc("get_candidate_home_stats" as any, {
        p_profile_id: profile.id,
      }),
      (supabase as any)
        .from("test_attempts")
        .select("percentage, score, total_marks, status, test_id, tests(marks_available, results_available)")
        .eq("candidate_id", profile.id)
        .eq("status", "submitted"),
      (supabase as any).rpc('get_user_global_stats', { p_user_id: profile.id }),
      (supabase as any)
        .from("logiclab_daily_challenge_user_activity")
        .select("activity_date, submission_count, solved, easy_solved, medium_solved, hard_solved, easy_attempted, medium_attempted, hard_attempted")
        .eq("user_id", profile.id)
        .order("activity_date", { ascending: true })
    ]);

    const candidateData = homeStatsRes.data as unknown as CandidateStatsResponse;
    const cp = candidateData?.profile || {};
    const stats = candidateData?.stats || {
      total_tests: 0,
      live_tests: 0,
      upcoming_tests: 0,
      completed_tests: 0,
    };

    const testAttempts = testAttemptsRes.data;

    let totalPercentage = 0;
    let validScoresCount = 0;
    if (testAttempts && testAttempts.length > 0) {
      testAttempts.forEach((attempt: any) => {
        const isPublished = attempt.tests?.marks_available || attempt.tests?.results_available;
        if (isPublished) {
          if (attempt.percentage !== null && attempt.percentage !== undefined) {
            totalPercentage += Number(attempt.percentage);
            validScoresCount++;
          } else if (attempt.score !== null && attempt.total_marks) {
            totalPercentage += (Number(attempt.score) / Number(attempt.total_marks)) * 100;
            validScoresCount++;
          }
        }
      });
    }
    const averageScore = validScoresCount > 0 ? totalPercentage / validScoresCount : 0;

    const testStats = {
      total_tests: stats.total_tests,
      live_tests: stats.live_tests,
      upcoming_tests: stats.upcoming_tests,
      completed_tests: testAttempts?.length || 0,
      average_score: averageScore,
    };

    const globalStats = (statsRes.data as any) || { 
      total: 0, solved: 0, 
      easy: { total: 0, solved: 0 }, 
      medium: { total: 0, solved: 0 }, 
      hard: { total: 0, solved: 0 } 
    };

    const allActivityRows = allActivityRes.data;

    const allActiveDates = new Map<string, { solved: boolean }>();
    for (const row of allActivityRows ?? []) {
      if (!row.activity_date) continue;
      allActiveDates.set(row.activity_date, { solved: !!row.solved });
    }

    const sortedDates = Array.from(allActiveDates.keys()).sort((a, b) => b.localeCompare(a));
    
    let currentStreak = 0;
    let maxStreak = 0;

    const hasActiveStreak = allActiveDates.has(todayStr) || allActiveDates.has(yesterdayStr);

    if (sortedDates.length > 0) {
      const ascDates = [...sortedDates].reverse();
      let prevDate: Date | null = null;
      let tempStreak = 0;
      
      for (const dStr of ascDates) {
        const currentDate = new Date(dStr);
        if (!prevDate) {
          tempStreak = 1;
        } else {
          const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 1) {
            tempStreak++;
          } else {
            if (tempStreak > maxStreak) maxStreak = tempStreak;
            tempStreak = 1;
          }
        }
        prevDate = currentDate;
      }
      if (tempStreak > maxStreak) maxStreak = tempStreak;

      if (hasActiveStreak) {
        const checkDate = allActiveDates.has(todayStr) ? new Date(today) : new Date(yesterdayDate);
        let checkStr = checkDate.toISOString().split("T")[0];
        
        while (allActiveDates.has(checkStr)) {
          currentStreak++;
          checkDate.setUTCDate(checkDate.getUTCDate() - 1);
          checkStr = checkDate.toISOString().split("T")[0];
        }
      }
    }

    if (currentStreak > maxStreak) maxStreak = currentStreak;
    const streakStats = { currentStreak, maxStreak };

    // 4. 20-week (140-day) Activity Calendar
    const activityRows = (allActivityRows ?? []).filter(
      (r: any) => r.activity_date && r.activity_date >= cutOffStr20Weeks
    );

    const uniqueDatesWithStatus = new Map<string, {
      solved: boolean
      attempted: boolean
      count: number
      easy_solved: number
      medium_solved: number
      hard_solved: number
      easy_attempted: number
      medium_attempted: number
      hard_attempted: number
    }>();

    for (const row of activityRows) {
      const dateStr = row.activity_date;
      uniqueDatesWithStatus.set(dateStr, {
        solved: !!row.solved,
        attempted: !row.solved && Number(row.submission_count) > 0,
        count: Number(row.submission_count),
        easy_solved: Number(row.easy_solved || 0),
        medium_solved: Number(row.medium_solved || 0),
        hard_solved: Number(row.hard_solved || 0),
        easy_attempted: Number(row.easy_attempted || 0),
        medium_attempted: Number(row.medium_attempted || 0),
        hard_attempted: Number(row.hard_attempted || 0),
      });
    }

    const activityCalendar: any[] = [];
    const daysToGenerate = 140; // 20 weeks * 7 days
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = d.toISOString().split("T")[0];
      const activity = uniqueDatesWithStatus.get(dateStr);
      activityCalendar.push({
        date: dateStr,
        count: activity?.count || 0,
        status: activity?.solved ? "solved" : activity?.attempted ? "attempted" : "none",
        dayOfWeek: d.getUTCDay(),
        easySolved: activity?.easy_solved || 0,
        mediumSolved: activity?.medium_solved || 0,
        hardSolved: activity?.hard_solved || 0,
        easyAttempted: activity?.easy_attempted || 0,
        mediumAttempted: activity?.medium_attempted || 0,
        hardAttempted: activity?.hard_attempted || 0,
      });
    }

    // 6. Fetch live/upcoming tests for candidate
    const submittedTestIds = (testAttempts ?? [])
      .map((a: any) => a.test_id);

    const nowIso = new Date().toISOString();

    let liveTests: any[] = [];
    let upcomingTests: any[] = [];

    // Find candidate's cohorts and eligible test IDs
    const { data: memberRows } = await (supabase as any)
      .from("cohort_students")
      .select("cohort_id")
      .eq("student_id", profile.id);

    const cohortIds = (memberRows ?? []).map((r: any) => r.cohort_id);

    let eligibleTestIds: string[] = [];
    if (cohortIds.length > 0) {
      const { data: testCohortRows } = await (supabase as any)
        .from("test_cohorts")
        .select("test_id")
        .in("cohort_id", cohortIds);

      eligibleTestIds = Array.from(new Set((testCohortRows ?? []).map((r: any) => String(r.test_id)))) as string[];
    }

    if (eligibleTestIds.length > 0) {
      let liveQuery = (supabase as any)
        .from("tests")
        .select("id, title, description, time_limit_seconds, available_from, available_until")
        .eq("status", "published")
        .in("id", eligibleTestIds)
        .lte("available_from", nowIso)
        .or(`available_until.gt.${nowIso},available_until.is.null`);

      if (submittedTestIds.length > 0) {
        liveQuery = liveQuery.not("id", "in", `(${submittedTestIds.join(",")})`);
      }

      const { data: liveData } = await liveQuery
        .order("available_until", { ascending: true, nullsFirst: false })
        .limit(2);
      
      if (liveData) liveTests = liveData;

      let upcomingQuery = (supabase as any)
        .from("tests")
        .select("id, title, description, time_limit_seconds, available_from, available_until")
        .eq("status", "published")
        .in("id", eligibleTestIds)
        .gt("available_from", nowIso);

      if (submittedTestIds.length > 0) {
        upcomingQuery = upcomingQuery.not("id", "in", `(${submittedTestIds.join(",")})`);
      }

      const { data: upcomingData } = await upcomingQuery
        .order("available_from", { ascending: true })
        .limit(2);

      if (upcomingData) upcomingTests = upcomingData;
    }

    // 7. Fetch Problem of the Day
    let initialPotd = await getCachedPotd(todayStr);
    let fullPotdProblem = null;

    if (initialPotd) {
      const { data: dbProblem } = await (supabase as any)
        .from("logiclab_problems")
        .select("id, number, title, difficulty, tags")
        .eq("id", initialPotd.problem_id)
        .maybeSingle();

      if (dbProblem) {
        const { data: statsRow } = await (supabase as any)
          .from("logiclab_problem_stats")
          .select("accepted_submissions, total_submissions")
          .eq("problem_id", initialPotd.problem_id)
          .maybeSingle();

        const totalSubmissions = statsRow?.total_submissions || 0;
        const acceptedSubmissions = statsRow?.accepted_submissions || 0;
        const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : null;

        fullPotdProblem = {
          ...dbProblem,
          acceptance_rate: acceptanceRate,
          total_submissions: totalSubmissions,
        };

        const { data: potdSub } = await (supabase as any)
          .from("logiclab_daily_challenge_submissions")
          .select("status")
          .eq("user_id", profile.id)
          .eq("problem_id", initialPotd.problem_id)
          .eq("status", "Accepted")
          .limit(1);

        fullPotdProblem.solved_status = (potdSub && potdSub.length > 0) ? "Accepted" : null;
      }
    }

    // 8. Fetch active & upcoming opportunities for candidate
    let opportunities: any[] = [];
    if (cohortIds.length > 0) {
      const { data: oppCohortRows } = await (supabase as any)
        .from("opportunity_cohorts")
        .select("opportunity_id")
        .in("cohort_id", cohortIds);

      const eligibleOppIds = Array.from(new Set((oppCohortRows ?? []).map((r: any) => String(r.opportunity_id)))) as string[];

      if (eligibleOppIds.length > 0) {
        const { data: oppsData } = await (supabase as any)
          .from("opportunities")
          .select("id, title, job_role, location, ctc_lpa, stipend_monthly, deadline, company:companies(name, logo_url)")
          .eq("status", "Published")
          .in("id", eligibleOppIds)
          .gte("deadline", nowIso)
          .order("deadline", { ascending: true })
          .limit(3);

        if (oppsData) opportunities = oppsData;
      }
    }

    // 9. Fetch active & upcoming events for candidate
    let candidateEvent: any = null;
    if (profile.institute_id) {
      const { data: rawEvents } = await (supabase as any)
        .from("events")
        .select(`
          id, title, description, date, venue, capacity, status, duration_minutes, speaker_name,
          event_cohorts(cohort_id)
        `)
        .eq("status", "Published")
        .eq("institute_id", profile.institute_id)
        .order("date", { ascending: true });

      if (rawEvents && rawEvents.length > 0) {
        const eligibleEvents = rawEvents.filter((event: any) => {
          const targetedCohorts = (event.event_cohorts ?? []).map((ec: any) => ec.cohort_id);
          if (targetedCohorts.length === 0) return true;
          return targetedCohorts.some((cId: string) => cohortIds.includes(cId));
        });

        const activeEvents = eligibleEvents.filter((e: any) => {
          const startTime = new Date(e.date).getTime();
          const endTime = startTime + (e.duration_minutes || 120) * 60 * 1000;
          const nowTime = Date.now();
          return nowTime >= startTime && nowTime <= endTime;
        });

        if (activeEvents.length > 0) {
          candidateEvent = { ...activeEvents[0], derived_status: "live" };
        } else {
          const upcomingEvents = eligibleEvents.filter((e: any) => new Date(e.date).getTime() > Date.now());
          if (upcomingEvents.length > 0) {
            candidateEvent = { ...upcomingEvents[0], derived_status: "upcoming" };
          }
        }
      }
    }

    const candidateProfile = {
      id: profile.id,
      username: profile.username || null,
      full_name: profile.full_name || null,
      first_name: profile.first_name || null,
      last_name: profile.last_name || null,
      profile_updated: profile.profile_updated || false,
      institute_id: profile.institute_id || null,
    };

    return (
      <CandidateDashboardClient
        profile={candidateProfile}
        stats={testStats}
        globalStats={globalStats}
        streakStats={streakStats}
        activityCalendar={activityCalendar}
        liveTests={liveTests}
        upcomingTests={upcomingTests}
        opportunities={opportunities}
        candidateEvent={candidateEvent}
        todayStr={todayStr}
        initialPotd={initialPotd}
        fullPotdProblem={fullPotdProblem}
      />
    );
  }

  // ── Institute ──────────────────────────────────────────────────────────────
  if (profile.account_type === "institute_primary" || profile.account_type === "institute_staff" || profile.account_type === "institute_placement_officer") {
    // Staff and TPO users resolve their parent institute's ID
    const instituteId = profile.institute_id

    // Resolve the primary profile ID for this institute to get stats
    let primaryProfileId = profile.id
    if (profile.account_type !== "institute_primary" && instituteId) {
      const { data: primaryLink } = await (supabase as any)
        .from("institute_profiles")
        .select("profile_id")
        .eq("institute_id", instituteId)
        .limit(1)
        .maybeSingle()
      if (primaryLink?.profile_id) {
        primaryProfileId = primaryLink.profile_id
      }
    }

    const { data } = await (supabase as any).rpc("get_institute_home_stats" as any, {
      p_profile_id: primaryProfileId,
    })

    const instituteData = data as unknown as InstituteStatsResponse
    const ip = instituteData?.profile
    const stats = instituteData?.stats

    // Fetch the actual profile update state from profiles
    let hasBeenSaved = false
    if (profile.account_type === "institute_primary") {
      hasBeenSaved = profile.profile_updated === true
    } else {
      const { data: instProfile } = await (supabase as any)
        .from("profiles")
        .select("profile_updated")
        .eq("id", primaryProfileId)
        .maybeSingle()
      hasBeenSaved = instProfile?.profile_updated === true
    }
    const profileReady = hasBeenSaved

    const profileSubtitle = !hasBeenSaved
      ? "You haven't set up your institution profile yet. Add your details to get started."
      : ""

    const subtypeLabel = profile.account_type === "institute_staff"
      ? "Staff"
      : profile.account_type === "institute_placement_officer"
        ? "TPO"
        : "Institute"

    return (
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
        <Suspense><LicenseBanner /></Suspense>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{profile.username ? `, @${profile.username}` : ""} · {subtypeLabel}
          </p>
        </div>

        <div className="space-y-6">
          {/* ── Profile banner (only for primary) ─────────────────────────── */}
          {profile.account_type === "institute_primary" && !profileReady && (
            <div className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Your institution profile isn't complete yet</p>
                <p className="text-xs text-muted-foreground">{profileSubtitle}</p>
              </div>
              <Link href="/myprofile" className="shrink-0">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                  Complete Profile
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}

          {/* ── Profile banner for own profile completeness (for staff/TPO) ─────────────────────────── */}
          {(profile.account_type === "institute_staff" || profile.account_type === "institute_placement_officer") && !profile.profile_updated && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 flex items-start justify-between gap-4 text-amber-800 dark:text-amber-300">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Your profile isn't complete yet</p>
                <p className="text-xs opacity-90">Please complete your profile details to unlock all dashboard tools.</p>
              </div>
              <Link href="/myprofile" className="shrink-0">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-amber-500/30 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300">
                  Complete Profile
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}

          {/* ── Test Stats (visible to staff and primary) ─────────────────── */}
          {stats && (profile.account_type === "institute_staff" || profile.account_type === "institute_primary") && (
            <div className="space-y-3">
              <SectionHeader title="Tests Overview" href="/tests" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:50ms]">
                  <StatCard
                    icon={<ListCheck className="h-4 w-4" />}
                    label="Total Tests"
                    value={stats.total_tests}
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:100ms]">
                  <StatCard
                    icon={<PlayCircle className="h-4 w-4" />}
                    label="Live"
                    value={stats.live_tests}
                    accent={stats.live_tests > 0 ? "green" : "muted"}
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:150ms]">
                  <StatCard
                    icon={<CalendarClock className="h-4 w-4" />}
                    label="Upcoming"
                    value={stats.upcoming_tests}
                    accent={stats.upcoming_tests > 0 ? "amber" : "muted"}
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:200ms]">
                  <StatCard
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Past"
                    value={stats.past_tests}
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:250ms]">
                  <StatCard
                    icon={<PenLine className="h-4 w-4" />}
                    label="Drafts"
                    value={stats.draft_tests}
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:300ms]">
                  <StatCard
                    icon={<Users className="h-4 w-4" />}
                    label="Attempts"
                    value={stats.total_attempts}
                    accent={stats.total_attempts > 0 ? "blue" : "muted"}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (profile.account_type === "admin") {
    const [
      candidatesCount,
      institutesCount,
      pendingTicketsCount,
      recentTicketsRes
    ] = await Promise.all([
      (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "institute_candidate"),
      (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "institute_primary"),
      (supabase as any).from("tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      (supabase as any).from("tickets").select("*").order("created_at", { ascending: false }).limit(5),
    ]);

    const stats = {
      candidates: candidatesCount.count ?? 0,
      institutes: institutesCount.count ?? 0,
      pendingTickets: pendingTicketsCount.count ?? 0,
    };

    const recentTickets = recentTicketsRes.data || [];

    return (
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
        <Suspense><LicenseBanner /></Suspense>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">
            Platform overview and recent support ticket queue · Admin
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Column 1: Stats stack */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:50ms]">
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label="Candidates"
                value={stats.candidates}
                accent="blue"
              />
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:150ms]">
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label="Institutes"
                value={stats.institutes}
                accent="green"
              />
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:250ms]">
              <StatCard
                icon={<PlayCircle className="h-4 w-4" />}
                label="Pending Tickets"
                value={stats.pendingTickets}
                accent={stats.pendingTickets > 0 ? "amber" : "muted"}
              />
            </div>
          </div>

          {/* Column 2 & 3: Support Queue Bento Card */}
          <Card className="lg:col-span-2 bg-card border border-border/40 shadow-sm rounded-2xl p-0 gap-0 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-delay:350ms]">
            <CardContent className="p-5 flex flex-col gap-3 flex-1 justify-start">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Support Tickets
                </h2>
                <Link href="/support" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1">
                  Go to Support Queue
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <RecentSupportTickets initialTickets={recentTickets} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 text-center text-muted-foreground">
      <p>Invalid or missing account type.</p>
    </div>
  );
}