"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSkillIconClass, DEVICON_SUFFIXES } from "@/lib/skill-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Award, Globe, Linkedin, Github, Tag,
  CheckCircle2, Flame, Target, Zap, Trophy, Brain,
  ChevronLeft, ChevronRight, Youtube, Instagram, Figma, Codepen, Code2
} from "lucide-react";
import type {
  CandidateEducation, CandidateExperience, CandidateProject,
  CandidateCertification, Skill,
} from "@/types/profile-extensions";
import { LogicLabStatsCards } from "@/app/(dashboard)/(licensed)/logiclab/_components/LogicLabStatsCards";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogicLabCalendarCell {
  date: string;
  count: number;
  status: "none" | "attempted" | "solved";
  dayOfWeek: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
}

export interface LogicLabData {
  streakStats: {
    currentStreak: number;
    maxStreak: number;
    totalActiveDays: number;
  };
  activityCalendar: LogicLabCalendarCell[];
  globalStats: {
    total: number;
    solved: number;
    easy: { total: number; solved: number };
    medium: { total: number; solved: number };
    hard: { total: number; solved: number };
  };
  topics: Array<{ name: string; solvedCount: number; totalCount: number; category: string }>;
  uniqueSolvedCount: number;
  points: number;
  rank?: number | null;
  badges: any[];
  allBadges: any[];
  recentSolved?: {
    id: number;
    title: string;
    difficulty: string;
    created_at: string;
  }[];
}

interface EventCertificate {
  ticketId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
}

interface PublicData {
  profile_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  username: string | null;
  avatar_path: string | null;
  bio: string | null;
  gender: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_links: string[] | null;
  course_name: string | null;
  passout_year: number | null;
  university_prn: string | null;
  institute_name: string | null;
  sgpa_semesters: (string | null)[];
}

interface Props {
  publicData: PublicData;
  educationData: CandidateEducation[];
  experienceData: CandidateExperience[];
  projectsData: CandidateProject[];
  certificationsData: CandidateCertification[];
  eventCertificates: EventCertificate[];
  allSkills: Skill[];
  selectedSkillIds: string[];
  semestersCount: number;
  logicLabData?: LogicLabData | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EDUCATION_TYPE_LABELS: Record<string, string> = {
  ssc: "Class 10 (SSC)",
  hsc: "Class 12 (HSC)",
  diploma: "Diploma",
  ug: "Undergraduate (UG)",
  pg: "Postgraduate (PG)",
  other: "Other",
};

const GENDER_REVERSE: Record<string, string> = { M: "Male", F: "Female", O: "Other" };

function getInitials(firstName: string | null, lastName: string | null, fullName: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  return fullName?.[0]?.toUpperCase() ?? "?";
}

function formatDateRange(start: string | null, end: string | null, isCurrent: boolean): string {
  const fmt = (d: string) =>
    new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(d));
  if (!start) return "";
  return `${fmt(start)} – ${isCurrent ? "Present" : end ? fmt(end) : ""}`;
}

function formatIssueDate(date: string | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(date));
}

function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return `${Math.floor(diffInDays / 365)}y ago`;
}

function SkillIcon({ name, className }: { name: string; className?: string }) {
  const iconClass = getSkillIconClass(name);
  if (iconClass) {
    const suffix = DEVICON_SUFFIXES[iconClass] || "plain";
    return (
      <span className={cn("inline-flex items-center justify-center shrink-0 text-muted-foreground w-4 h-4 text-base", className)}>
        <i className={`devicon-${iconClass}-${suffix}`} style={{ fontSize: "inherit", lineHeight: 1 }} />
      </span>
    );
  }
  return <Tag className={cn("text-muted-foreground shrink-0 w-4 h-4", className)} />;
}

function SectionCard({ title, children }: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function PortfolioLink({ link }: { link: string }) {
  const [imgError, setImgError] = useState(false);
  const href = link.startsWith("http") ? link : `https://${link}`;
  let hostname = "";
  try { hostname = new URL(href).hostname.toLowerCase(); } catch { }
  const displayUrl = link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

  let Icon: any = Globe;
  let useLucide = false;

  if (hostname.includes("github.com")) { Icon = Github; useLucide = true; }
  else if (hostname.includes("linkedin.com")) { Icon = Linkedin; useLucide = true; }
  else if (hostname.includes("twitter.com") || hostname.includes("x.com")) { Icon = XIcon; useLucide = true; }
  else if (hostname.includes("youtube.com")) { Icon = Youtube; useLucide = true; }
  else if (hostname.includes("instagram.com")) { Icon = Instagram; useLucide = true; }
  else if (hostname.includes("figma.com")) { Icon = Figma; useLucide = true; }
  else if (hostname.includes("codepen.io")) { Icon = Codepen; useLucide = true; }
  else if (hostname.includes("leetcode.com") || hostname.includes("hackerrank.com")) { Icon = Code2; useLucide = true; }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-accent transition-colors max-w-[200px] truncate"
    >
      {useLucide ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : hostname && !imgError ? (
        <img
          src={`https://icons.duckduckgo.com/ip3/${hostname}.ico`}
          alt=""
          className="w-4 h-4 rounded-sm object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">{displayUrl}</span>
    </a>
  );
}

// ─── LogicLab Analytics Section ───────────────────────────────────────────────

function LogicLabAnalyticsSection({ data }: { data: LogicLabData }) {
  const recentSolved = (data.recentSolved || []).slice(0, 5);
  const { streakStats, activityCalendar, globalStats } = data;

  return (
    <Card className="gap-3 py-5">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">
          LogicLab Performance
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Key Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xl font-bold tabular-nums leading-tight">
              {streakStats.currentStreak}
              <span className="text-xs font-normal text-muted-foreground ml-1">days</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Streak (Max {streakStats.maxStreak})</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xl font-bold tabular-nums leading-tight">
              {globalStats.solved}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ {globalStats.total}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Problems Solved</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xl font-bold tabular-nums leading-tight">{streakStats.totalActiveDays}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active Days</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xl font-bold tabular-nums leading-tight">{data.topics.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Topics Practiced</p>
          </div>
        </div>

        {/* ── LogicLab Stats Cards (difficulty rings + heatmap) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <LogicLabStatsCards globalStats={globalStats} activityCalendar={activityCalendar} streakStats={streakStats} />

          {/* Badges card */}
          <Dialog>
            <Card className="flex flex-col py-0 h-full">
              <CardHeader className="flex flex-row items-center justify-between pt-4 pb-1">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Badges
                </CardTitle>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 justify-between pb-4 pt-0 min-h-[180px]">
                <div className="mb-2">
                  <p className="text-3xl font-bold tracking-tight leading-none">{data.badges?.length || 0}</p>
                </div>

                <DialogTrigger asChild>
                  <div className="flex-1 flex items-center justify-center py-2 cursor-pointer rounded-md hover:bg-muted/30 transition-colors">
                    <div className="flex items-center -space-x-4 px-2">
                      {(() => {
                        const allBadges = data.allBadges || [];
                        const earnedBadgeIds = new Map(data.badges?.map(b => [b.id, b]) || []);
                        const earnedBadgesOnly = allBadges.filter((b: any) => earnedBadgeIds.has(b.id));
                        const previewBadges = [...earnedBadgesOnly]
                          .sort((a, b) => {
                            const aDate = new Date(earnedBadgeIds.get(a.id).earned_at).getTime();
                            const bDate = new Date(earnedBadgeIds.get(b.id).earned_at).getTime();
                            return bDate - aDate;
                          })
                          .slice(0, 4);

                        if (previewBadges.length === 0) {
                          return <p className="text-xs text-muted-foreground italic">No badges yet.</p>;
                        }

                        return previewBadges.map((badge: any, idx: number) => {
                          const isImage = badge.icon_name.endsWith(".png") || badge.icon_name.endsWith(".svg") || badge.icon_name.endsWith(".webp") || badge.icon_name.includes("/");
                          let IconComp: any = Award;
                          if (!isImage) {
                            if (badge.icon_name === "Flame") IconComp = Flame;
                            else if (badge.icon_name === "Zap") IconComp = Zap;
                            else if (badge.icon_name === "Trophy") IconComp = Trophy;
                            else if (badge.icon_name === "Brain") IconComp = Brain;
                            else if (badge.icon_name === "Target") IconComp = Target;
                          }
                          const earnedData = earnedBadgeIds.get(badge.id);
                          const earnedDateStr = earnedData?.earned_at
                            ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(earnedData.earned_at))
                            : null;

                          return (
                            <Tooltip key={idx}>
                              <TooltipTrigger asChild>
                                <div className={cn("relative transition-transform hover:scale-110 flex-shrink-0 cursor-pointer hover:z-20", `z-[${4 - idx}]`)}>
                                  <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] flex items-center justify-center">
                                    {isImage ? (
                                      <img src={badge.icon_name} alt={badge.name} className="w-full h-full object-contain drop-shadow-md" />
                                    ) : (
                                      <div className="w-full h-full rounded-full flex items-center justify-center border bg-muted">
                                        <IconComp className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[220px] text-center p-3" sideOffset={10}>
                                <p className="font-bold text-sm mb-1">{badge.name}</p>
                                {earnedDateStr && <p className="text-xs text-muted-foreground">Earned {earnedDateStr}</p>}
                              </TooltipContent>
                            </Tooltip>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </DialogTrigger>

                {data.badges && data.badges.length > 0 && (
                  <div className="mt-auto pt-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Most Recent</p>
                    <p className="text-sm font-semibold leading-tight truncate">{data.badges[0].name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>All Badges</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 mt-6 place-items-center pb-8">
                {(() => {
                  const allBadges = data.allBadges || [];
                  const earnedBadgeIds = new Map(data.badges?.map(b => [b.id, b]) || []);

                  if (allBadges.length === 0) {
                    return <p className="text-sm text-muted-foreground italic col-span-full text-center py-8">No badges available yet.</p>;
                  }

                  const sortedAllBadges = [...allBadges].sort((a: any, b: any) => {
                    const aEarned = earnedBadgeIds.has(a.id);
                    const bEarned = earnedBadgeIds.has(b.id);
                    if (aEarned && !bEarned) return -1;
                    if (!aEarned && bEarned) return 1;
                    if (aEarned && bEarned) {
                      const aDate = new Date(earnedBadgeIds.get(a.id).earned_at).getTime();
                      const bDate = new Date(earnedBadgeIds.get(b.id).earned_at).getTime();
                      return bDate - aDate;
                    }
                    return 0;
                  });

                  return sortedAllBadges.map((badge: any, idx: number) => {
                    const earnedData = earnedBadgeIds.get(badge.id);
                    const isEarned = !!earnedData;
                    const earnedDateStr = isEarned && earnedData.earned_at
                      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(earnedData.earned_at))
                      : null;
                    const isImage = badge.icon_name.endsWith(".png") || badge.icon_name.endsWith(".svg") || badge.icon_name.endsWith(".webp") || badge.icon_name.includes("/");
                    let IconComp: any = Award;
                    if (!isImage) {
                      if (badge.icon_name === "Flame") IconComp = Flame;
                      else if (badge.icon_name === "Zap") IconComp = Zap;
                      else if (badge.icon_name === "Trophy") IconComp = Trophy;
                      else if (badge.icon_name === "Brain") IconComp = Brain;
                      else if (badge.icon_name === "Target") IconComp = Target;
                    }

                    return (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <div className={cn("flex flex-col items-center gap-3 text-center", !isEarned && "opacity-40 grayscale")}>
                            <div className={cn("w-16 h-16 sm:w-[72px] sm:h-[72px] flex items-center justify-center transition-transform", isEarned && "hover:scale-110 cursor-pointer")}>
                              {isImage ? (
                                <img src={badge.icon_name} alt={badge.name} className="w-full h-full object-contain drop-shadow-md" />
                              ) : (
                                <div className="w-full h-full rounded-full flex items-center justify-center border bg-muted">
                                  <IconComp className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-center">
                              <p className="font-semibold text-sm leading-tight mb-1">{badge.name}</p>
                              {isEarned ? (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{earnedDateStr}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">Locked</Badge>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[220px] text-center p-3" sideOffset={10}>
                          <p className="font-bold text-sm mb-1">{badge.name}</p>
                          <p className="text-xs text-muted-foreground leading-snug mb-2">{badge.description}</p>
                          {isEarned
                            ? <Badge variant="secondary" className="text-[10px]">Earned {earnedDateStr}</Badge>
                            : <Badge variant="outline" className="text-[10px] text-muted-foreground">Locked</Badge>
                          }
                        </TooltipContent>
                      </Tooltip>
                    );
                  });
                })()}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Recent Submissions ── */}
        {recentSolved.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Submissions
            </p>
            <div className="rounded-lg border overflow-hidden">
              <div className="divide-y divide-border/40">
                {recentSolved.map((problem, idx) => (
                  <div key={`${problem.id}-${idx}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-sm font-medium truncate">{problem.title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-5 px-1.5 font-medium border-transparent",
                          problem.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                          problem.difficulty === "Medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                          "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {problem.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                        {getRelativeTime(problem.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CandidatePublicProfileView({
  publicData,
  educationData,
  experienceData,
  projectsData,
  certificationsData,
  eventCertificates,
  allSkills,
  selectedSkillIds,
  semestersCount,
  logicLabData,
}: Props) {
  const supabase = createClient();

  const avatarUrl = publicData.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(publicData.avatar_path).data.publicUrl
    : null;

  const selectedSet = new Set(selectedSkillIds);
  const groupedSkills: Record<string, Skill[]> = {};
  allSkills.forEach((skill) => {
    if (!selectedSet.has(skill.id)) return;
    if (!groupedSkills[skill.category]) groupedSkills[skill.category] = [];
    groupedSkills[skill.category].push(skill);
  });

  const validSgpas = publicData.sgpa_semesters.filter((v): v is string => v !== null && v !== "");
  const cgpa =
    validSgpas.length > 0
      ? (validSgpas.reduce((sum, v) => sum + parseFloat(v), 0) / validSgpas.length).toFixed(2)
      : null;

  const sscRecord = educationData.find((e) => e.type === "ssc");
  const hscRecord = educationData.find((e) => e.type === "hsc");
  const diplomaRecord = educationData.find((e) => e.type === "diploma");

  const hasLinks =
    publicData.linkedin_url ||
    publicData.github_url ||
    (publicData.portfolio_links ?? []).filter(Boolean).length > 0;

  const hasSkills = selectedSkillIds.length > 0;
  const hasExperiences = experienceData.length > 0;
  const hasProjects = projectsData.length > 0;
  const hasCertifications = certificationsData.length > 0;
  const hasEventCerts = eventCertificates.length > 0;
  const hasSgpa = validSgpas.length > 0;
  const hasEducationHistory = sscRecord || hscRecord || diplomaRecord;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8">

        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-cirka tracking-tight">Candidate Profile</h1>
          <p className="text-sm text-muted-foreground">
            Viewing public profile of{" "}
            <span className="font-medium text-foreground">
              {publicData.full_name || publicData.username || "this candidate"}
            </span>
          </p>
        </div>

        <div className="space-y-6">

          {/* ── Hero Card ─────────────────────────────────────────────── */}
          <Card className="py-5">
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 border-2 border-muted">
                  <AvatarImage src={avatarUrl ?? undefined} alt={publicData.full_name} className="object-cover" />
                  <AvatarFallback className="text-2xl font-semibold">
                    {getInitials(publicData.first_name, publicData.last_name, publicData.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">{publicData.full_name || "—"}</h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                    {publicData.username && (
                      <span className="text-sm text-muted-foreground">@{publicData.username}</span>
                    )}
                    {publicData.gender && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {GENDER_REVERSE[publicData.gender] ?? publicData.gender}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── About Section ────────────────────────────────────────── */}
          {publicData.bio && (
            <SectionCard title="About">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {publicData.bio}
              </p>
            </SectionCard>
          )}

          {/* ── Links & Profiles ─────────────────────────────────────── */}
          {hasLinks && (
            <SectionCard title="Links & Profiles">
              <div className="flex flex-wrap gap-3">
                {publicData.linkedin_url && (
                  <a
                    href={publicData.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-accent transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                )}
                {publicData.github_url && (
                  <a
                    href={publicData.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-accent transition-colors"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                )}
                {(publicData.portfolio_links ?? []).filter(Boolean).map((link, i) => (
                  <PortfolioLink key={i} link={link} />
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Education ────────────────────────────────────────────── */}
          <SectionCard title="Education">
            <div className="space-y-5">
              {(publicData.course_name || publicData.passout_year || publicData.university_prn) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {publicData.course_name && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Course / Branch</p>
                      <p className="text-sm font-medium">{publicData.course_name}</p>
                    </div>
                  )}
                  {publicData.institute_name && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Institute</p>
                      <p className="text-sm font-medium">{publicData.institute_name}</p>
                    </div>
                  )}
                  {publicData.passout_year && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Expected Graduation</p>
                      <p className="text-sm font-medium">{publicData.passout_year}</p>
                    </div>
                  )}
                  {publicData.university_prn && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">University PRN</p>
                      <p className="text-sm font-medium">{publicData.university_prn}</p>
                    </div>
                  )}
                </div>
              )}

              {hasSgpa && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs text-muted-foreground font-medium">Semester-wise SGPA</p>
                      {cgpa && <Badge variant="secondary" className="text-xs h-5">CGPA {cgpa}</Badge>}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {publicData.sgpa_semesters.map((sgpa, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-md border text-center py-2 px-1",
                            sgpa ? "bg-primary/5 border-primary/20" : "border-dashed border-muted-foreground/20 bg-muted/30"
                          )}
                        >
                          <p className="text-[9px] text-muted-foreground mb-0.5">Sem {i + 1}</p>
                          <p className={cn("text-sm font-semibold", sgpa ? "text-foreground" : "text-muted-foreground/40")}>
                            {sgpa || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {hasEducationHistory && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-3">Education History</p>
                    <div className="space-y-3">
                      {[sscRecord, hscRecord, diplomaRecord].filter(Boolean).map((rec) => (
                        <div
                          key={rec!.id}
                          className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{EDUCATION_TYPE_LABELS[rec!.type] ?? rec!.type}</p>
                            <p className="text-xs text-muted-foreground">{rec!.institution_name}</p>
                          </div>
                          <div className="text-right shrink-0 space-y-0.5">
                            <p className="text-sm font-semibold">{Number(rec!.grade_or_percentage).toFixed(2)}%</p>
                            <p className="text-xs text-muted-foreground">{rec!.passout_year}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!publicData.course_name && !hasSgpa && !hasEducationHistory && (
                <p className="text-sm text-muted-foreground italic">No education details added yet.</p>
              )}
            </div>
          </SectionCard>

          {/* ── Skills ───────────────────────────────────────────────── */}
          {hasSkills && (
            <SectionCard title="Skills">
              <div className="space-y-4">
                {Object.entries(groupedSkills).map(([category, skills]) => (
                  <div key={category}>
                    <p className="text-xs text-muted-foreground font-medium mb-2">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge key={skill.id} variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
                          <SkillIcon name={skill.name} />
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── LogicLab Performance ─────────────────────────────────── */}
          {logicLabData && <LogicLabAnalyticsSection data={logicLabData} />}

          {/* ── Experience ───────────────────────────────────────────── */}
          {hasExperiences && (
            <SectionCard title="Experience">
              <div className="space-y-4">
                {experienceData.map((exp, idx) => (
                  <div key={exp.id} className="space-y-2">
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-semibold">{exp.title}</p>
                        <p className="text-sm text-muted-foreground font-medium">{exp.company_name}</p>
                        {exp.location && <p className="text-xs text-muted-foreground">{exp.location}</p>}
                      </div>
                      <div className="shrink-0 sm:text-right flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                        {(exp.start_date || exp.end_date) && (
                          <span className="text-xs text-muted-foreground">
                            {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                          </span>
                        )}
                        {exp.is_current && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">Current</Badge>
                        )}
                      </div>
                    </div>
                    {exp.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Projects ─────────────────────────────────────────────── */}
          {hasProjects && (
            <SectionCard title="Projects">
              <div className="space-y-4">
                {projectsData.map((proj, idx) => (
                  <div key={proj.id}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{proj.title}</p>
                            {proj.is_ongoing && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Ongoing</Badge>
                            )}
                            {proj.project_url && (
                              <a
                                href={proj.project_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Globe className="h-3 w-3" />
                                View
                              </a>
                            )}
                          </div>
                          {proj.associated_with && (
                            <p className="text-xs text-muted-foreground">{proj.associated_with}</p>
                          )}
                        </div>
                        {(proj.start_date || proj.end_date) && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDateRange(proj.start_date, proj.end_date, proj.is_ongoing)}
                          </span>
                        )}
                      </div>
                      {proj.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{proj.description}</p>
                      )}
                      {proj.skills && proj.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {proj.skills.map((s, i) => (
                            <Badge key={i} variant="outline" className="gap-1 text-[11px] h-5 px-1.5">
                              <SkillIcon name={s} className="w-3 h-3" />
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Certifications ───────────────────────────────────────── */}
          {hasCertifications && (
            <SectionCard title="Certifications">
              <div className="space-y-4">
                {certificationsData.map((cert, idx) => (
                  <div key={cert.id}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold">{cert.name}</p>
                        <p className="text-sm text-muted-foreground">{cert.issuing_org}</p>
                        {cert.credential_id && (
                          <p className="text-xs text-muted-foreground">{cert.credential_id}</p>
                        )}
                        {cert.credential_url && (
                          <a
                            href={cert.credential_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Globe className="h-3 w-3" />
                            View credential
                          </a>
                        )}
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        {cert.issue_date && (
                          <p className="text-xs text-muted-foreground">{formatIssueDate(cert.issue_date)}</p>
                        )}
                        {cert.does_not_expire ? (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">No Expiry</Badge>
                        ) : cert.expiration_date ? (
                          <p className="text-xs text-muted-foreground">Expires {formatIssueDate(cert.expiration_date)}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Event Participation ──────────────────────────────────── */}
          {hasEventCerts && (
            <SectionCard title="Event Participation">
              <div className="space-y-3">
                {eventCertificates.map((cert, idx) => (
                  <div key={cert.ticketId}>
                    {idx > 0 && <Separator className="mb-3" />}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{cert.eventTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(cert.eventDate))}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">Attended</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

        </div>
      </div>
    </TooltipProvider>
  );
}
