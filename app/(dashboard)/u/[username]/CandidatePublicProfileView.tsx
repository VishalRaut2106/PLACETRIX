"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSkillIconClass, DEVICON_SUFFIXES } from "@/lib/skill-icon";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Briefcase, FolderGit2, Award, Link2,
  Globe, Linkedin, Github, Mail, AtSign, Tag, Building2,
  CalendarDays, Hash, BarChart3, BookOpen, Flame, Trophy,
  Target, Code2, Brain, Zap, CheckCircle2, Activity, Sparkles,
  ChevronRight, ChevronDown, Twitter, Youtube, Instagram, Figma, Codepen
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
  badges: any[];
  allBadges: any[];
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
    new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  if (!start) return "";
  return `${fmt(start)} – ${isCurrent ? "Present" : end ? fmt(end) : ""}`;
}

function formatIssueDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function SkillIcon({ name, className }: { name: string; className?: string }) {
  const iconClass = getSkillIconClass(name);
  const sizeClass = "w-4 h-4 text-base";
  const cleanClassName = className
    ?.replace(/\btext-(?:base|lg|sm|xs|\[11px\]|\[10px\])\b/g, "")
    ?.trim();

  if (iconClass) {
    const suffix = DEVICON_SUFFIXES[iconClass] || "plain";
    return (
      <span className={cn("inline-flex items-center justify-center shrink-0 text-muted-foreground", sizeClass, cleanClassName)}>
        <i className={`devicon-${iconClass}-${suffix}`} style={{ fontSize: "inherit", lineHeight: 1 }} />
      </span>
    );
  }
  return (
    <Tag className={cn("text-muted-foreground shrink-0", sizeClass, cleanClassName)} />
  );
}

function SectionCard({ icon: Icon, title, children, defaultExpanded = true }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={cn('transition-all', 'duration-200')}>
      <CardHeader
        className={cn('pb-3', 'cursor-pointer', 'select-none', 'hover:bg-muted/30', 'transition-colors', 'rounded-t-xl')}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className={cn('flex', 'items-center', 'justify-between', 'text-base', 'font-semibold')}>
          <div className={cn('flex', 'items-center', 'gap-2')}>
            <Icon className={cn('h-4', 'w-4', 'text-muted-foreground')} />
            {title}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
        </CardTitle>
      </CardHeader>
      {isExpanded && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-0.5">
      <p className={cn('text-xs', 'text-muted-foreground')}>{label}</p>
      <p className={cn('text-sm', 'font-medium')}>{value}</p>
    </div>
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
  const href = link.startsWith('http') ? link : `https://${link}`;

  let hostname = "";
  try {
    hostname = new URL(href).hostname.toLowerCase();
  } catch { }

  const displayUrl = link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

  let Icon = Globe;
  let iconColor = "";
  let useLucide = false;

  if (hostname.includes("github.com")) {
    Icon = Github;
    useLucide = true;
  } else if (hostname.includes("linkedin.com")) {
    Icon = Linkedin;
    iconColor = "text-[#0077B5]";
    useLucide = true;
  } else if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
    Icon = XIcon as any;
    iconColor = "text-foreground";
    useLucide = true;
  } else if (hostname.includes("youtube.com")) {
    Icon = Youtube;
    iconColor = "text-[#FF0000]";
    useLucide = true;
  } else if (hostname.includes("instagram.com")) {
    Icon = Instagram;
    iconColor = "text-[#E1306C]";
    useLucide = true;
  } else if (hostname.includes("figma.com")) {
    Icon = Figma;
    useLucide = true;
  } else if (hostname.includes("codepen.io")) {
    Icon = Codepen;
    useLucide = true;
  } else if (hostname.includes("leetcode.com") || hostname.includes("hackerrank.com")) {
    Icon = Code2;
    useLucide = true;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex', 'items-center', 'gap-2', 'px-3', 'py-1.5', 'rounded-md', 'text-sm', 'font-medium', 'border', 'border-border', 'hover:bg-accent', 'transition-colors', 'max-w-[200px]', 'truncate')}
    >
      {useLucide ? (
        <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
      ) : hostname && !imgError ? (
        <img
          src={`https://icons.duckduckgo.com/ip3/${hostname}.ico`}
          alt=""
          className={cn('w-4', 'h-4', 'rounded-sm', 'object-contain')}
          onError={() => setImgError(true)}
        />
      ) : (
        <Globe className={cn('h-4', 'w-4', 'shrink-0', 'text-muted-foreground')} />
      )}
      <span className="truncate">{displayUrl}</span>
    </a>
  );
}

// ─── LogicLab Spider Web & Analytics Sub-components ───────────────────────────

function SpiderWebRadarChart({
  topics,
}: {
  topics: Array<{ name: string; solvedCount: number; totalCount: number; category: string }>;
}) {
  const defaultTopics = [
    { name: "Arrays", solvedCount: 0, totalCount: 1, category: "Fundamental" },
    { name: "Strings", solvedCount: 0, totalCount: 1, category: "Fundamental" },
    { name: "DP", solvedCount: 0, totalCount: 1, category: "Advanced" },
    { name: "Trees", solvedCount: 0, totalCount: 1, category: "Intermediate" },
    { name: "Math", solvedCount: 0, totalCount: 1, category: "Intermediate" },
    { name: "Sorting", solvedCount: 0, totalCount: 1, category: "Intermediate" },
  ];

  let displayTopics = (topics || []).slice(0, 6);
  if (displayTopics.length < 3) {
    const existing = new Set(displayTopics.map((t) => t.name.toLowerCase()));
    for (const d of defaultTopics) {
      if (!existing.has(d.name.toLowerCase()) && displayTopics.length < 6) {
        displayTopics.push(d);
      }
    }
  }

  const numAxes = displayTopics.length;
  const cx = 130;
  const cy = 130;
  const radius = 75;

  const maxCount = Math.max(...displayTopics.map((t) => t.solvedCount), 1);

  const levels = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (axisIndex: number, scale: number) => {
    const angle = (axisIndex * 2 * Math.PI) / numAxes - Math.PI / 2;
    const r = radius * scale;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const dataPoints = displayTopics.map((t, i) => {
    const scale = t.solvedCount > 0 ? Math.max(t.solvedCount / maxCount, 0.18) : 0.08;
    return getCoordinates(i, scale);
  });
  const dataPolygonString = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className={cn('w-full', 'flex', 'flex-col', 'items-center', 'justify-center', 'p-2', 'rounded-xl', 'border', 'border-border/40', 'bg-card/50')}>
      <div className={cn('flex', 'items-center', 'justify-between', 'w-full', 'mb-1', 'text-xs')}>
        <span className={cn('font-semibold', 'uppercase', 'tracking-wider', 'text-muted-foreground', 'text-[11px]')}>
          Topic Dimension Radar
        </span>
        <Badge variant="secondary" className={cn('text-[10px]', 'h-4', 'px-1.5', 'font-normal')}>
          Spider Web
        </Badge>
      </div>

      <div className={cn('relative', 'w-full', 'max-w-[260px]', 'aspect-square', 'flex', 'items-center', 'justify-center')}>
        <svg viewBox="0 0 260 260" className={cn('w-full', 'h-full', 'overflow-visible')}>
          <defs>
            <radialGradient id="spiderWebGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.12" />
            </radialGradient>
          </defs>

          {/* Concentric Web Polygons */}
          {levels.map((level, lIdx) => {
            const levelPoints = Array.from({ length: numAxes }).map((_, i) => getCoordinates(i, level));
            const polyStr = levelPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            return (
              <polygon
                key={lIdx}
                points={polyStr}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className={cn('text-border/50', 'dark:text-border/40')}
                strokeDasharray={lIdx === levels.length - 1 ? undefined : "2 2"}
              />
            );
          })}

          {/* Radial Axes */}
          {Array.from({ length: numAxes }).map((_, i) => {
            const outer = getCoordinates(i, 1.0);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-border/60"
              />
            );
          })}

          {/* Data Filled Polygon */}
          <polygon
            points={dataPolygonString}
            fill="url(#spiderWebGradient)"
            stroke="#10b981"
            strokeWidth="2"
            className={cn('transition-all', 'duration-700', 'ease-out')}
          />

          {/* Data Nodes & Topic Labels */}
          {displayTopics.map((t, i) => {
            const dataCoord = dataPoints[i];
            const labelCoord = getCoordinates(i, 1.25);
            const isTop = labelCoord.y < cy - 10;
            const isBottom = labelCoord.y > cy + 10;
            const isLeft = labelCoord.x < cx - 10;
            const isRight = labelCoord.x > cx + 10;

            let textAnchor: "middle" | "start" | "end" = "middle";
            if (isLeft && !isTop && !isBottom) textAnchor = "end";
            else if (isRight && !isTop && !isBottom) textAnchor = "start";

            return (
              <g key={i}>
                <circle
                  cx={dataCoord.x}
                  cy={dataCoord.y}
                  r="3.5"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <text
                  x={labelCoord.x}
                  y={labelCoord.y}
                  textAnchor={textAnchor}
                  dominantBaseline="middle"
                  className={cn('fill-foreground', 'text-[10px]', 'font-semibold', 'tracking-tight')}
                >
                  {t.name}
                  <tspan className={cn('fill-emerald-600', 'dark:text-emerald-400', 'text-[9px]', 'font-normal')} dx="3">
                    ({t.solvedCount}/{t.totalCount})
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ProfileConcentricRing({
  radius,
  value,
  max,
  color,
  trackColor,
}: {
  radius: number;
  value: number;
  max: number;
  color: string;
  trackColor: string;
}) {
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? Math.min(value / max, 1) : 0;
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <g transform="rotate(-90 50 50)">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth="7"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className={cn('transition-all', 'duration-1000', 'ease-out')}
      />
    </g>
  );
}

function getProficiencyBadge(count: number) {
  if (count >= 10) return { label: "Expert", bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  if (count >= 5) return { label: "Advanced", bg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
  if (count >= 3) return { label: "Proficient", bg: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20" };
  return { label: "Explorer", bg: "bg-muted/50 text-muted-foreground border-border/40" };
}

function getMonthHeadersForWeeks(weeks: LogicLabCalendarCell[][]) {
  const headers: Array<{ label: string; span: number }> = [];
  let currentMonth = "";
  let currentSpan = 0;

  weeks.forEach((week) => {
    if (week.length > 0) {
      const firstDayDate = new Date(week[0].date);
      const monthName = firstDayDate.toLocaleDateString("en-IN", { month: "short" });
      if (monthName !== currentMonth) {
        if (currentMonth !== "") {
          headers.push({ label: currentMonth, span: currentSpan });
        }
        currentMonth = monthName;
        currentSpan = 1;
      } else {
        currentSpan++;
      }
    }
  });
  if (currentMonth !== "") {
    headers.push({ label: currentMonth, span: currentSpan });
  }

  return headers;
}

function LogicLabAnalyticsSection({ data }: { data: LogicLabData }) {
  const [hoveredCell, setHoveredCell] = useState<LogicLabCalendarCell | null>(null);
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);

  const { streakStats, activityCalendar, globalStats, topics } = data;
  const totalSolved = globalStats.solved || 0;
  const totalProblems = globalStats.total || 1;
  const easySolved = globalStats.easy.solved || 0;
  const mediumSolved = globalStats.medium.solved || 0;
  const hardSolved = globalStats.hard.solved || 0;

  const easyTotal = globalStats.easy.total || 1;
  const mediumTotal = globalStats.medium.total || 1;
  const hardTotal = globalStats.hard.total || 1;

  // Group activity into weeks (7 days per column, 20 columns)
  const weeks: LogicLabCalendarCell[][] = [];
  let currentWeek: LogicLabCalendarCell[] = [];

  (activityCalendar || []).forEach((cell, index) => {
    currentWeek.push(cell);
    if (currentWeek.length === 7 || index === activityCalendar.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const monthHeaders = getMonthHeadersForWeeks(weeks);

  return (
    <Card className={cn('border-border/60', 'shadow-sm', 'overflow-hidden', 'transition-all', 'duration-200')}>
      <CardHeader
        className={cn('pb-3', 'border-b', 'border-border/30', 'bg-muted/20', 'cursor-pointer', 'select-none', 'hover:bg-muted/30', 'transition-colors')}
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
      >
        <div className={cn('flex', 'items-center', 'justify-between', 'flex-wrap', 'gap-2')}>
          <CardTitle className={cn('flex', 'items-center', 'gap-2', 'text-base', 'font-semibold')}>
            <Brain className={cn('h-4', 'w-4', 'text-emerald-500')} />
            LogicLab & Problem Solving Performance
          </CardTitle>
          <div className={cn('flex', 'items-center', 'gap-2')}>
            <Badge variant="outline" className={cn('gap-1', 'text-xs', 'font-normal', 'border-emerald-500/30', 'text-emerald-600', 'dark:text-emerald-400')}>
              <Sparkles className={cn('h-3', 'w-3')} />
              Verified
            </Badge>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-300",
                isSectionExpanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </CardHeader>

      {isSectionExpanded && (
        <CardContent className={cn('p-4', 'sm:p-6', 'space-y-6')}>
          {/* ── Key Stat Pills Row (Mobile Grid 2-col, Desktop 4-col) ── */}
          <div className={cn('grid', 'grid-cols-2', 'sm:grid-cols-4', 'gap-3')}>
            <div className={cn('rounded-xl', 'border', 'border-amber-500/20', 'bg-amber-500/5', 'p-3.5', 'flex', 'items-center', 'gap-3')}>
              <div className={cn('p-2', 'rounded-lg', 'bg-amber-500/10', 'text-amber-600', 'dark:text-amber-400', 'shrink-0')}>
                <Flame className={cn('h-4', 'sm:h-5', 'w-4', 'sm:w-5')} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-xl', 'sm:text-2xl', 'font-bold', 'tabular-nums', 'text-foreground', 'leading-tight', 'truncate')}>
                  {streakStats.currentStreak} <span className={cn('text-xs', 'font-normal', 'text-muted-foreground')}>days</span>
                </p>
                <p className={cn('text-[11px]', 'text-muted-foreground', 'truncate')}>Streak (Max {streakStats.maxStreak})</p>
              </div>
            </div>

            <div className={cn('rounded-xl', 'border', 'border-emerald-500/20', 'bg-emerald-500/5', 'p-3.5', 'flex', 'items-center', 'gap-3')}>
              <div className={cn('p-2', 'rounded-lg', 'bg-emerald-500/10', 'text-emerald-600', 'dark:text-emerald-400', 'shrink-0')}>
                <Trophy className={cn('h-4', 'sm:h-5', 'w-4', 'sm:w-5')} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-xl', 'sm:text-2xl', 'font-bold', 'tabular-nums', 'text-foreground', 'leading-tight', 'truncate')}>
                  {totalSolved} <span className={cn('text-xs', 'font-normal', 'text-muted-foreground')}>/ {totalProblems}</span>
                </p>
                <p className={cn('text-[11px]', 'text-muted-foreground', 'truncate')}>Problems Solved</p>
              </div>
            </div>

            <div className={cn('rounded-xl', 'border', 'border-blue-500/20', 'bg-blue-500/5', 'p-3.5', 'flex', 'items-center', 'gap-3')}>
              <div className={cn('p-2', 'rounded-lg', 'bg-blue-500/10', 'text-blue-600', 'dark:text-blue-400', 'shrink-0')}>
                <Activity className={cn('h-4', 'sm:h-5', 'w-4', 'sm:w-5')} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-xl', 'sm:text-2xl', 'font-bold', 'tabular-nums', 'text-foreground', 'leading-tight', 'truncate')}>
                  {streakStats.totalActiveDays}
                </p>
                <p className={cn('text-[11px]', 'text-muted-foreground', 'truncate')}>Active Days</p>
              </div>
            </div>

            <div className={cn('rounded-xl', 'border', 'border-indigo-500/20', 'bg-indigo-500/5', 'p-3.5', 'flex', 'items-center', 'gap-3')}>
              <div className={cn('p-2', 'rounded-lg', 'bg-indigo-500/10', 'text-indigo-600', 'dark:text-indigo-400', 'shrink-0')}>
                <Target className={cn('h-4', 'sm:h-5', 'w-4', 'sm:w-5')} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-xl', 'sm:text-2xl', 'font-bold', 'tabular-nums', 'text-foreground', 'leading-tight', 'truncate')}>
                  {topics.length}
                </p>
                <p className={cn('text-[11px]', 'text-muted-foreground', 'truncate')}>Topics Practiced</p>
              </div>
            </div>
          </div>

          {/* ── Topic Abilities Section: Dual Column (Spider Web Radar + Skill Bars) ── */}
          <div className={cn('grid', 'grid-cols-1', 'md:grid-cols-12', 'gap-6', 'items-center')}>
            {/* Left: SVG Spider Web Radar Chart (5 columns) */}
            <div className={cn('md:col-span-5', 'flex', 'items-center', 'justify-center')}>
              <SpiderWebRadarChart topics={topics} />
            </div>

            {/* Right: Topic Proficiency Skill Bars (7 columns) */}
            <div className={cn('md:col-span-7', 'space-y-3')}>
              <div className={cn('flex', 'items-center', 'justify-between')}>
                <p className={cn('text-xs', 'font-semibold', 'uppercase', 'tracking-wider', 'text-muted-foreground')}>
                  Topic Proficiency & Ability Breakdown
                </p>
                <span className={cn('text-xs', 'text-muted-foreground')}>{topics.length} total topics</span>
              </div>

              {topics.length === 0 ? (
                <div className={cn('rounded-xl', 'border', 'border-dashed', 'p-6', 'text-center', 'text-sm', 'text-muted-foreground')}>
                  No topic data available yet.
                </div>
              ) : (
                <div className={cn('space-y-5', 'pr-1', 'max-h-[320px]', 'overflow-y-auto', 'custom-scrollbar')}>
                  {(["Advanced", "Intermediate", "Fundamental"] as const).map(category => {
                    const catTopics = topics.filter(t => t.category === category);
                    if (catTopics.length === 0) return null;
                    const catSolved = catTopics.reduce((sum, t) => sum + t.solvedCount, 0);
                    const catTotal = catTopics.reduce((sum, t) => sum + t.totalCount, 0);

                    return (
                      <div key={category} className="space-y-3">
                        <div className={cn('flex', 'items-center', 'justify-between')}>
                          <p className={cn('text-[11px]', 'font-bold', 'text-foreground', 'uppercase', 'tracking-wider')}>{category}</p>
                          <span className={cn('text-xs', 'text-muted-foreground', 'font-medium')}>{catSolved} <span className="opacity-50">/ {catTotal}</span></span>
                        </div>
                        <div className={cn('grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-x-6', 'gap-y-3')}>
                          {catTopics.map((t) => {
                            const ratio = t.totalCount > 0 ? t.solvedCount / t.totalCount : 0;
                            const badge = getProficiencyBadge(t.solvedCount);
                            const percent = Math.round(ratio * 100);
                            return (
                              <div key={t.name} className={cn('flex', 'items-center', 'justify-between', 'text-xs', 'py-1', 'border-b', 'border-border/10', 'last:border-0')}>
                                <div className={cn('flex', 'items-center', 'gap-1.5')}>
                                  <span className={cn('font-semibold', 'text-foreground/90')}>{t.name}</span>
                                </div>
                                <span className={cn('tabular-nums', 'text-muted-foreground', 'text-[11px]', 'font-medium')}>
                                  {t.solvedCount} <span className="opacity-50">/ {t.totalCount}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Difficulty Concentric Rings & Activity Heatmap ── */}
          <div className={cn('pt-6', 'mt-6', 'border-t', 'border-border/30')}>
            <div className={cn('grid', 'grid-cols-1', 'lg:grid-cols-3', 'gap-6', 'animate-in', 'fade-in', 'slide-in-from-top-2', 'duration-300', 'min-w-0')}>
              <LogicLabStatsCards globalStats={globalStats} activityCalendar={activityCalendar} streakStats={streakStats} />

              {/* Card 3: Achievements / Badges */}
              {/* Card 3: Achievements / Badges */}
              {/* Card 3: Achievements / Badges */}
              <Dialog>
                <Card className={cn('min-w-0', 'flex', 'flex-col', 'relative', 'transition-all', 'hover:border-border/80', 'h-full', 'bg-card', 'py-0')}>
                  <CardHeader className={cn('flex', 'flex-row', 'items-center', 'justify-between', 'pt-4', 'pb-1')}>
                    <CardTitle className={cn('text-xs', 'font-semibold', 'text-muted-foreground', 'uppercase', 'tracking-wider')}>
                      Badges
                    </CardTitle>
                    <DialogTrigger asChild>
                      <button className={cn('p-1', '-m-1', 'rounded', 'hover:bg-muted', 'transition-colors', 'group', 'cursor-pointer', 'focus:outline-none', 'focus:ring-2', 'focus:ring-primary', 'focus:ring-offset-2')}>
                        <ChevronRight className={cn('h-4', 'w-4', 'text-muted-foreground', 'group-hover:text-foreground', 'transition-colors')} />
                      </button>
                    </DialogTrigger>
                  </CardHeader>

                    <CardContent className={cn('flex', 'flex-col', 'flex-1', 'justify-between', 'pb-4', 'pt-0', 'min-h-[180px]')}>
                      {/* Top row number */}
                      <div className="mb-2">
                        <p className={cn('text-3xl', 'font-bold', 'tracking-tight', 'leading-none')}>{data.badges?.length || 0}</p>
                      </div>

                      {/* Badge Row (up to 4 badges) */}
                      <DialogTrigger asChild>
                        <div className={cn('flex-1', 'flex', 'items-center', 'justify-center', 'py-2', 'overflow-visible', 'cursor-pointer', 'group', 'hover:bg-muted/5', 'rounded-md', 'mx-2', 'transition-colors')}>
                          <div className={cn('flex', 'items-center', '-space-x-4', 'px-2')}>
                            {(() => {
                              const allBadges = data.allBadges || [];
                              const earnedBadgeIds = new Map(data.badges?.map(b => [b.id, b]) || []);
                              
                              // Get up to 4 badges to show in the preview row (only earned badges, most recent first)
                              const earnedBadgesOnly = allBadges.filter((b: any) => earnedBadgeIds.has(b.id));
                              const previewBadges = [...earnedBadgesOnly].sort((a, b) => {
                                const aDate = new Date(earnedBadgeIds.get(a.id).earned_at).getTime();
                                const bDate = new Date(earnedBadgeIds.get(b.id).earned_at).getTime();
                                return bDate - aDate;
                              }).slice(0, 4);

                            if (previewBadges.length === 0) return <div className={cn('text-xs', 'text-muted-foreground', 'italic')}>No badges yet.</div>;

                            return previewBadges.map((badge: any, idx: number) => {
                              const isEarned = earnedBadgeIds.has(badge.id);
                              const earnedData = earnedBadgeIds.get(badge.id);
                              const earnedDateStr = isEarned && earnedData.earned_at
                                ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(earnedData.earned_at))
                                : null;

                              const isImage = badge.icon_name.endsWith('.png') || badge.icon_name.endsWith('.svg') || badge.icon_name.endsWith('.webp') || badge.icon_name.includes('/');

                              let IconComp = Award;
                              if (!isImage) {
                                if (badge.icon_name === 'Flame') IconComp = Flame;
                                else if (badge.icon_name === 'Zap') IconComp = Zap;
                                else if (badge.icon_name === 'Trophy') IconComp = Trophy;
                                else if (badge.icon_name === 'Brain') IconComp = Brain;
                                else if (badge.icon_name === 'Target') IconComp = Target;
                              }

                              let gradientClass = "from-primary/20 to-primary/5 border-primary/30 text-primary";
                              let glowColor = "group-hover:bg-primary/20";

                              if (badge.badge_category === 'Streak') {
                                gradientClass = "from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-500";
                                glowColor = "group-hover:bg-orange-500/20";
                              } else if (badge.badge_category === 'Milestone') {
                                gradientClass = "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30 text-indigo-500";
                                glowColor = "group-hover:bg-indigo-500/20";
                              }

                              return (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <div className={cn("relative transition-transform hover:scale-110 flex-shrink-0 cursor-pointer group hover:z-20", !isEarned && "opacity-40 grayscale hover:grayscale-[0.5] hover:opacity-70", `z-[${4 - idx}]`)}>
                                      <div className={cn('w-[72px]', 'h-[72px]', 'sm:w-[84px]', 'sm:h-[84px]', 'flex', 'items-center', 'justify-center')}>
                                        {isImage ? (
                                          <img src={badge.icon_name} alt={badge.name} className={cn('w-full', 'h-full', 'object-contain', 'drop-shadow-md', 'group-hover:drop-shadow-xl')} />
                                        ) : (
                                          <div className={cn("w-full h-full rounded-full flex items-center justify-center border bg-gradient-to-br transition-all overflow-hidden", gradientClass)}>
                                            {isEarned && <div className={cn("absolute inset-0 opacity-0 transition-opacity duration-300 blur-xl", glowColor)} />}
                                            <div className={cn('relative', 'z-10', 'w-11', 'h-11', 'sm:w-12', 'sm:h-12', 'rounded-full', 'bg-background/80', 'shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]', 'dark:shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)]', 'flex', 'items-center', 'justify-center', 'border', 'border-foreground/5', 'transition-transform', 'duration-300', 'group-hover:scale-110')}>
                                              <IconComp className={cn('w-5', 'h-5', 'sm:w-6', 'sm:h-6', 'drop-shadow-sm')} />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className={cn('max-w-[220px]', 'text-center', 'p-3', 'bg-popover', 'text-popover-foreground', 'border', 'shadow-md')} sideOffset={10}>
                                    <p className={cn('font-bold', 'text-[14px]', 'mb-1.5')}>{badge.name}</p>
                                    <p className={cn('text-[12px]', 'text-muted-foreground', 'leading-snug', 'mb-2.5')}>{badge.description}</p>
                                    {isEarned ? (
                                      <div className={cn('bg-primary/10', 'text-primary', 'py-1', 'px-2', 'rounded', 'font-medium', 'text-[10px]', 'inline-block', 'uppercase', 'tracking-wider')}>
                                        Earned {earnedDateStr}
                                      </div>
                                    ) : (
                                      <div className={cn('bg-muted', 'text-muted-foreground/80', 'py-1', 'px-2', 'rounded', 'font-medium', 'text-[10px]', 'inline-flex', 'items-center', 'gap-1.5', 'uppercase', 'tracking-wider')}>
                                        Locked
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            });
                          })()}
                        </div>
                      </div>
                      </DialogTrigger>

                      {/* Most Recent Badge */}
                      {data.badges && data.badges.length > 0 && (
                        <div className={cn('mt-auto', 'pt-2')}>
                          <p className={cn('text-[12px]', 'text-muted-foreground', 'mb-1')}>Most Recent Badge</p>
                          <p className={cn('text-[14px]', 'font-semibold', 'leading-tight', 'truncate')}>{data.badges[0].name}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                <DialogContent className={cn('max-w-3xl', 'max-h-[85vh]', 'overflow-y-auto', 'bg-background', 'text-foreground')}>
                  <DialogHeader>
                    <DialogTitle className="text-xl">All Badges</DialogTitle>
                  </DialogHeader>
                  <div className={cn('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-5', 'gap-8', 'mt-6', 'place-items-center', 'pb-8')}>
                    {(() => {
                      const allBadges = data.allBadges || [];
                      const earnedBadgeIds = new Map(data.badges?.map(b => [b.id, b]) || []);

                      if (allBadges.length === 0) {
                        return <div className={cn('text-sm', 'text-muted-foreground', 'italic', 'w-full', 'col-span-full', 'text-center', 'py-8')}>No badges available yet.</div>;
                      }
                      
                      // Sort all badges to show earned first, most recent first
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
                          ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(earnedData.earned_at))
                          : null;

                        const isImage = badge.icon_name.endsWith('.png') || badge.icon_name.endsWith('.svg') || badge.icon_name.endsWith('.webp') || badge.icon_name.includes('/');

                        let IconComp = Award;
                        if (!isImage) {
                          if (badge.icon_name === 'Flame') IconComp = Flame;
                          else if (badge.icon_name === 'Zap') IconComp = Zap;
                          else if (badge.icon_name === 'Trophy') IconComp = Trophy;
                          else if (badge.icon_name === 'Brain') IconComp = Brain;
                          else if (badge.icon_name === 'Target') IconComp = Target;
                        }

                        let gradientClass = "from-primary/20 to-primary/5 border-primary/30 text-primary";
                        let glowColor = "group-hover:bg-primary/20";

                        if (badge.badge_category === 'Streak') {
                          gradientClass = "from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-500";
                          glowColor = "group-hover:bg-orange-500/20";
                        } else if (badge.badge_category === 'Milestone') {
                          gradientClass = "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30 text-indigo-500";
                          glowColor = "group-hover:bg-indigo-500/20";
                        }

                        return (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <div className={cn('flex', 'flex-col', 'items-center', 'gap-3', 'group', 'text-center')}>
                                {isImage ? (
                                  <div
                                    className={cn(
                                      "relative flex items-center justify-center transition-all duration-500 ease-out w-16 h-16 sm:w-[72px] sm:h-[72px]",
                                      isEarned ? "hover:scale-110 hover:drop-shadow-2xl cursor-pointer" : "opacity-40 grayscale hover:grayscale-[0.5] hover:opacity-70 transition-all duration-300"
                                    )}
                                  >
                                    <img src={badge.icon_name} alt={badge.name} className={cn('w-full', 'h-full', 'object-contain', 'drop-shadow-md', 'group-hover:drop-shadow-xl')} />
                                  </div>
                                ) : (
                                  <div 
                                    className={cn(
                                      "relative flex flex-col items-center justify-center w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border bg-gradient-to-br transition-all duration-300 overflow-hidden",
                                      gradientClass,
                                      isEarned ? "hover:scale-110 hover:shadow-xl cursor-pointer" : "opacity-40 grayscale hover:grayscale-[0.5] hover:opacity-70 transition-all duration-300"
                                    )}
                                  >
                                    {isEarned && <div className={cn("absolute inset-0 opacity-0 transition-opacity duration-300 blur-xl", glowColor)} />}
                                    <div className={cn("relative z-10 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)] border border-foreground/5 transition-transform duration-300", isEarned && "group-hover:scale-110")}>
                                      <IconComp className={cn('h-5', 'w-5', 'sm:h-6', 'sm:w-6', 'drop-shadow-sm')} />
                                    </div>
                                  </div>
                                )}
                                
                                <div className={cn('flex', 'flex-col', 'items-center', 'mt-1')}>
                                  <p className={cn('font-bold', 'text-[14px]', 'leading-tight', 'mb-1')}>{badge.name}</p>
                                  {isEarned ? (
                                    <div className={cn('bg-primary/10', 'text-primary', 'py-0.5', 'px-2', 'rounded', 'font-medium', 'text-[10px]', 'inline-block', 'uppercase', 'tracking-wider')}>
                                      {earnedDateStr}
                                    </div>
                                  ) : (
                                    <div className={cn('bg-muted', 'text-muted-foreground/80', 'py-0.5', 'px-2', 'rounded', 'font-medium', 'text-[10px]', 'inline-flex', 'items-center', 'gap-1.5', 'uppercase', 'tracking-wider')}>
                                      Locked
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className={cn('max-w-[220px]', 'text-center', 'p-3', 'bg-popover', 'text-popover-foreground', 'border', 'shadow-md')} sideOffset={10}>
                              <p className={cn('font-bold', 'text-[14px]', 'mb-1.5')}>{badge.name}</p>
                              <p className={cn('text-[12px]', 'text-muted-foreground', 'leading-snug', 'mb-2.5')}>{badge.description}</p>
                              {isEarned ? (
                                <div className={cn('bg-primary/10', 'text-primary', 'py-1', 'px-2', 'rounded', 'font-medium', 'text-[10px]', 'inline-block', 'uppercase', 'tracking-wider')}>
                                  Earned {earnedDateStr}
                                </div>
                              ) : (
                                <div className={cn('bg-muted', 'text-muted-foreground/80', 'py-1', 'px-2', 'rounded', 'font-medium', 'text-[10px]', 'inline-flex', 'items-center', 'gap-1.5', 'uppercase', 'tracking-wider')}>
                                  Locked
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      });
                    })()}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      )}
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

  // Resolve avatar URL
  const avatarUrl = publicData.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(publicData.avatar_path).data.publicUrl
    : null;

  // Group skills by category
  const selectedSet = new Set(selectedSkillIds);
  const groupedSkills: Record<string, Skill[]> = {};
  allSkills.forEach((skill) => {
    if (!selectedSet.has(skill.id)) return;
    if (!groupedSkills[skill.category]) groupedSkills[skill.category] = [];
    groupedSkills[skill.category].push(skill);
  });

  // SGPA grid values
  const validSgpas = publicData.sgpa_semesters.filter((v): v is string => v !== null && v !== "");
  const cgpa =
    validSgpas.length > 0
      ? (validSgpas.reduce((sum, v) => sum + parseFloat(v), 0) / validSgpas.length).toFixed(2)
      : null;

  // Education records
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
    <div className={cn('flex', 'flex-col', 'gap-6', 'px-4', 'py-8', 'md:px-8')}>
      {/* Page Header */}
      <div className={cn('flex', 'flex-col', 'gap-1.5')}>
        <h1 className={cn('text-3xl', 'font-bold', 'font-cirka', 'tracking-tight', 'text-foreground')}>
          Candidate Profile
        </h1>
        <p className={cn('text-sm', 'text-muted-foreground')}>
          Viewing public profile of{" "}
          <span className={cn('font-medium', 'text-foreground')}>
            {publicData.full_name || publicData.username || "this candidate"}
          </span>
        </p>
      </div>

      <div className="space-y-6">

        {/* ── Hero Card ─────────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6">
            <div className={cn('flex', 'flex-col', 'sm:flex-row', 'items-center', 'sm:items-start', 'gap-6')}>
              {/* Avatar */}
              <Avatar className={cn('h-24', 'w-24', 'shrink-0', 'border-2', 'border-muted')}>
                <AvatarImage src={avatarUrl ?? undefined} alt={publicData.full_name} className="object-cover" />
                <AvatarFallback className={cn('text-2xl', 'font-semibold')}>
                  {getInitials(publicData.first_name, publicData.last_name, publicData.full_name)}
                </AvatarFallback>
              </Avatar>

              {/* Name / Username / Bio */}
              <div className={cn('flex-1', 'min-w-0', 'text-center', 'sm:text-left', 'space-y-2')}>
                <div>
                  <h2 className={cn('text-2xl', 'font-bold', 'tracking-tight', 'text-foreground')}>
                    {publicData.full_name || "—"}
                  </h2>
                  {publicData.username && (
                    <div className={cn('flex', 'items-center', 'justify-center', 'sm:justify-start', 'gap-1', 'mt-0.5', 'text-muted-foreground')}>
                      <AtSign className={cn('h-3.5', 'w-3.5')} />
                      <span className="text-sm">{publicData.username}</span>
                    </div>
                  )}
                </div>

                {/* Quick meta badges */}
                <div className={cn('flex', 'flex-wrap', 'gap-2', 'justify-center', 'sm:justify-start', 'items-center')}>
                  {publicData.course_name && (
                    <Badge variant="secondary" className={cn('inline-flex', 'items-center', 'gap-1.5', 'px-3', 'py-1', 'text-xs', 'font-medium', 'rounded-full', 'max-w-full')}>
                      <GraduationCap className={cn('h-3.5', 'w-3.5', 'shrink-0')} />
                      <span className="truncate">{publicData.course_name}{publicData.passout_year ? ` · ${publicData.passout_year}` : ""}</span>
                    </Badge>
                  )}
                  {publicData.institute_name && (
                    <Badge variant="outline" className={cn('inline-flex', 'items-center', 'gap-1.5', 'px-3', 'py-1', 'text-xs', 'font-normal', 'rounded-full', 'border', 'border-border', 'bg-muted/30', 'max-w-full')}>
                      <Building2 className={cn('h-3.5', 'w-3.5', 'shrink-0', 'text-muted-foreground')} />
                      <span className={cn('truncate', 'max-w-[280px]', 'sm:max-w-md')}>{publicData.institute_name}</span>
                    </Badge>
                  )}
                  {cgpa && (
                    <Badge variant="outline" className={cn('inline-flex', 'items-center', 'gap-1.5', 'px-3', 'py-1', 'text-xs', 'text-primary', 'border-primary/30', 'bg-primary/5', 'rounded-full')}>
                      <BarChart3 className={cn('h-3.5', 'w-3.5', 'shrink-0')} />
                      CGPA {cgpa}
                    </Badge>
                  )}
                  {logicLabData?.points ? (
                    <Badge variant="outline" className={cn('inline-flex', 'items-center', 'gap-1.5', 'px-3', 'py-1', 'text-xs', 'text-amber-600', 'border-amber-500/30', 'bg-amber-500/10', 'rounded-full', 'dark:text-amber-400')}>
                      <Sparkles className={cn('h-3.5', 'w-3.5', 'shrink-0')} />
                      {logicLabData.points} Points
                    </Badge>
                  ) : null}
                  {logicLabData?.badges && logicLabData.badges.length > 0 && (() => {
                    const latestBadge = logicLabData.badges[0];
                    const isImage = latestBadge.icon_name.endsWith('.png') || latestBadge.icon_name.endsWith('.svg') || latestBadge.icon_name.endsWith('.webp') || latestBadge.icon_name.includes('/');

                    let IconComp = Award;
                    if (!isImage) {
                      if (latestBadge.icon_name === 'Flame') IconComp = Flame;
                      else if (latestBadge.icon_name === 'Zap') IconComp = Zap;
                      else if (latestBadge.icon_name === 'Trophy') IconComp = Trophy;
                      else if (latestBadge.icon_name === 'Brain') IconComp = Brain;
                      else if (latestBadge.icon_name === 'Target') IconComp = Target;
                    }

                    return (
                      <Badge variant="outline" className={cn('inline-flex', 'items-center', 'gap-1.5', 'px-3', 'py-1', 'text-xs', 'text-indigo-600', 'border-indigo-500/30', 'bg-indigo-500/10', 'rounded-full', 'dark:text-indigo-400')}>
                        {isImage ? (
                          <img src={latestBadge.icon_name} alt="" className={cn('h-3.5', 'w-3.5', 'object-contain')} />
                        ) : (
                          <IconComp className={cn('h-3.5', 'w-3.5', 'shrink-0')} />
                        )}
                        {latestBadge.name}
                      </Badge>
                    );
                  })()}
                  {publicData.gender && (
                    <Badge variant="outline" className={cn('inline-flex', 'items-center', 'gap-1.5', 'px-3', 'py-1', 'text-xs', 'rounded-full')}>
                      {GENDER_REVERSE[publicData.gender] ?? publicData.gender}
                    </Badge>
                  )}
                </div>

                {/* Bio */}
                {publicData.bio && (
                  <p className={cn('text-sm', 'text-muted-foreground', 'leading-relaxed', 'max-w-2xl')}>
                    {publicData.bio}
                  </p>
                )}

                {/* Email */}
                <div className={cn('flex', 'items-center', 'justify-center', 'sm:justify-start', 'gap-1.5', 'text-sm', 'text-muted-foreground')}>
                  <Mail className={cn('h-3.5', 'w-3.5')} />
                  <a
                    href={`mailto:${publicData.email}`}
                    className={cn('hover:text-foreground', 'transition-colors')}
                  >
                    {publicData.email}
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Professional Links ─────────────────────────────────────────────── */}
        {hasLinks && (
          <SectionCard icon={Link2} title="Links & Profiles">
            <div className={cn('flex', 'flex-wrap', 'gap-3')}>
              {publicData.linkedin_url && (
                <a
                  href={publicData.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('inline-flex', 'items-center', 'gap-2', 'px-3', 'py-1.5', 'rounded-md', 'text-sm', 'font-medium', 'border', 'border-border', 'hover:bg-accent', 'transition-colors')}
                >
                  <Linkedin className={cn('h-4', 'w-4', 'text-[#0077B5]')} />
                  LinkedIn
                </a>
              )}
              {publicData.github_url && (
                <a
                  href={publicData.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('inline-flex', 'items-center', 'gap-2', 'px-3', 'py-1.5', 'rounded-md', 'text-sm', 'font-medium', 'border', 'border-border', 'hover:bg-accent', 'transition-colors')}
                >
                  <Github className={cn('h-4', 'w-4')} />
                  GitHub
                </a>
              )}
              {(publicData.portfolio_links ?? []).filter(Boolean).map((link, i) => (
                <PortfolioLink key={i} link={link} />
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Education ─────────────────────────────────────────────────────── */}
        <SectionCard icon={GraduationCap} title="Education">
          <div className="space-y-5">
            {/* Current Course */}
            {(publicData.course_name || publicData.passout_year) && (
              <div className={cn('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'gap-4')}>
                <InfoRow label="Course / Branch" value={publicData.course_name} />
                <InfoRow label="Institute" value={publicData.institute_name} />
                <InfoRow label="Expected Graduation" value={publicData.passout_year ? String(publicData.passout_year) : null} />
              </div>
            )}

            {/* SGPA Grid */}
            {hasSgpa && (
              <>
                <Separator />
                <div>
                  <p className={cn('text-xs', 'text-muted-foreground', 'font-medium', 'mb-3', 'flex', 'items-center', 'gap-1.5')}>
                    <BarChart3 className={cn('h-3.5', 'w-3.5')} />
                    Semester-wise SGPA
                    {cgpa && (
                      <Badge variant="secondary" className={cn('ml-1', 'text-xs', 'h-5')}>
                        CGPA {cgpa}
                      </Badge>
                    )}
                  </p>
                  <div className={cn('grid', 'grid-cols-4', 'sm:grid-cols-8', 'gap-2')}>
                    {publicData.sgpa_semesters.map((sgpa, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-md border text-center py-2 px-1",
                          sgpa
                            ? "bg-primary/5 border-primary/20"
                            : "border-dashed border-muted-foreground/20 bg-muted/30"
                        )}
                      >
                        <p className={cn('text-[9px]', 'text-muted-foreground', 'mb-0.5')}>Sem {i + 1}</p>
                        <p className={cn("text-sm font-semibold", sgpa ? "text-foreground" : "text-muted-foreground/40")}>
                          {sgpa || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Education History (SSC/HSC/Diploma) */}
            {hasEducationHistory && (
              <>
                <Separator />
                <div>
                  <p className={cn('text-xs', 'text-muted-foreground', 'font-medium', 'mb-3', 'flex', 'items-center', 'gap-1.5')}>
                    <BookOpen className={cn('h-3.5', 'w-3.5')} />
                    Education History
                  </p>
                  <div className="space-y-3">
                    {[sscRecord, hscRecord, diplomaRecord]
                      .filter(Boolean)
                      .map((rec) => (
                        <div
                          key={rec!.id}
                          className={cn('flex', 'items-start', 'justify-between', 'gap-4', 'p-3', 'rounded-lg', 'border', 'border-border', 'bg-muted/30')}
                        >
                          <div className="space-y-0.5">
                            <p className={cn('text-sm', 'font-medium')}>
                              {EDUCATION_TYPE_LABELS[rec!.type] ?? rec!.type}
                            </p>
                            <p className={cn('text-xs', 'text-muted-foreground')}>{rec!.institution_name}</p>
                          </div>
                          <div className={cn('text-right', 'shrink-0', 'space-y-0.5')}>
                            <p className={cn('text-sm', 'font-semibold')}>{Number(rec!.grade_or_percentage).toFixed(2)}%</p>
                            <p className={cn('text-xs', 'text-muted-foreground')}>{rec!.passout_year}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}

            {/* Nothing at all */}
            {!publicData.course_name && !hasSgpa && !hasEducationHistory && (
              <p className={cn('text-sm', 'text-muted-foreground', 'italic')}>No education details added yet.</p>
            )}
          </div>
        </SectionCard>

        {/* ── Skills ────────────────────────────────────────────────────────── */}
        {hasSkills && (
          <SectionCard icon={Tag} title="Skills">
            <div className="space-y-4">
              {Object.entries(groupedSkills).map(([category, skills]) => (
                <div key={category}>
                  <p className={cn('text-xs', 'text-muted-foreground', 'font-medium', 'mb-2')}>{category}</p>
                  <div className={cn('flex', 'flex-wrap', 'gap-2')}>
                    {skills.map((skill) => (
                      <Badge
                        key={skill.id}
                        variant="secondary"
                        className={cn('gap-1.5', 'py-1', 'px-2.5', 'text-xs', 'font-medium')}
                      >
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

        {/* ── LogicLab Performance Summary ────────────────────────────── */}
        {logicLabData && <LogicLabAnalyticsSection data={logicLabData} />}

        {/* ── Experience ────────────────────────────────────────────────────── */}
        {hasExperiences && (
          <SectionCard icon={Briefcase} title="Experience">
            <div className="space-y-4">
              {experienceData.map((exp, idx) => (
                <div key={exp.id} className="space-y-2">
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className={cn('flex', 'flex-col', 'sm:flex-row', 'sm:items-start', 'justify-between', 'gap-1', 'sm:gap-4')}>
                    <div className={cn('space-y-0.5', 'min-w-0')}>
                      <p className={cn('text-sm', 'font-semibold', 'text-foreground')}>{exp.title}</p>
                      <p className={cn('text-sm', 'text-muted-foreground', 'font-medium')}>{exp.company_name}</p>
                      {exp.location && (
                        <p className={cn('text-xs', 'text-muted-foreground')}>{exp.location}</p>
                      )}
                    </div>
                    <div className={cn('shrink-0', 'sm:text-right', 'flex', 'sm:flex-col', 'items-center', 'sm:items-end', 'gap-2', 'sm:gap-1', 'mt-0.5', 'sm:mt-0')}>
                      {(exp.start_date || exp.end_date) && (
                        <div className={cn('flex', 'items-center', 'gap-1', 'text-xs', 'text-muted-foreground')}>
                          <CalendarDays className={cn('h-3.5', 'w-3.5')} />
                          <span>
                            {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                          </span>
                        </div>
                      )}
                      {exp.is_current && (
                        <Badge variant="secondary" className={cn('text-[10px]', 'h-4', 'px-1.5', 'font-normal')}>
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
                  {exp.description && (
                    <p className={cn('text-sm', 'text-muted-foreground', 'leading-relaxed', 'pt-1')}>
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Projects ──────────────────────────────────────────────────────── */}
        {hasProjects && (
          <SectionCard icon={FolderGit2} title="Projects">
            <div className="space-y-4">
              {projectsData.map((proj, idx) => (
                <div key={proj.id}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="space-y-1.5">
                    <div className={cn('flex', 'items-start', 'justify-between', 'gap-4')}>
                      <div className={cn('flex-1', 'min-w-0')}>
                        <div className={cn('flex', 'items-center', 'gap-2', 'flex-wrap')}>
                          <p className={cn('text-sm', 'font-semibold')}>{proj.title}</p>
                          {proj.is_ongoing && (
                            <Badge variant="secondary" className={cn('text-[10px]', 'h-4', 'px-1.5')}>Ongoing</Badge>
                          )}
                          {proj.project_url && (
                            <a
                              href={proj.project_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn('inline-flex', 'items-center', 'gap-1', 'text-[11px]', 'text-primary', 'hover:underline')}
                            >
                              <Globe className={cn('h-3', 'w-3')} />
                              View
                            </a>
                          )}
                        </div>
                        {proj.associated_with && (
                          <p className={cn('text-xs', 'text-muted-foreground')}>{proj.associated_with}</p>
                        )}
                      </div>
                      {(proj.start_date || proj.end_date) && (
                        <div className={cn('shrink-0', 'flex', 'items-center', 'gap-1', 'text-xs', 'text-muted-foreground')}>
                          <CalendarDays className={cn('h-3', 'w-3')} />
                          <span>
                            {formatDateRange(proj.start_date, proj.end_date, proj.is_ongoing)}
                          </span>
                        </div>
                      )}
                    </div>
                    {proj.description && (
                      <p className={cn('text-sm', 'text-muted-foreground', 'leading-relaxed')}>
                        {proj.description}
                      </p>
                    )}
                    {proj.skills && proj.skills.length > 0 && (
                      <div className={cn('flex', 'flex-wrap', 'gap-1.5', 'mt-1')}>
                        {proj.skills.map((s, i) => (
                          <Badge key={i} variant="outline" className={cn('gap-1', 'text-[11px]', 'h-5', 'px-1.5')}>
                            <SkillIcon name={s} className={cn('w-3', 'h-3')} />
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

        {/* ── Certifications ────────────────────────────────────────────────── */}
        {hasCertifications && (
          <SectionCard icon={Award} title="Certifications">
            <div className="space-y-4">
              {certificationsData.map((cert, idx) => (
                <div key={cert.id}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className={cn('flex', 'items-start', 'justify-between', 'gap-4')}>
                    <div className={cn('flex-1', 'min-w-0', 'space-y-0.5')}>
                      <p className={cn('text-sm', 'font-semibold')}>{cert.name}</p>
                      <p className={cn('text-sm', 'text-muted-foreground')}>{cert.issuing_org}</p>
                      {cert.credential_id && (
                        <div className={cn('flex', 'items-center', 'gap-1', 'text-xs', 'text-muted-foreground')}>
                          <Hash className={cn('h-3', 'w-3')} />
                          {cert.credential_id}
                        </div>
                      )}
                      {cert.credential_url && (
                        <a
                          href={cert.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn('inline-flex', 'items-center', 'gap-1', 'text-xs', 'text-primary', 'hover:underline')}
                        >
                          <Globe className={cn('h-3', 'w-3')} />
                          View credential
                        </a>
                      )}
                    </div>
                    <div className={cn('shrink-0', 'text-right', 'space-y-0.5')}>
                      {cert.issue_date && (
                        <div className={cn('flex', 'items-center', 'gap-1', 'text-xs', 'text-muted-foreground', 'justify-end')}>
                          <CalendarDays className={cn('h-3', 'w-3')} />
                          {formatIssueDate(cert.issue_date)}
                        </div>
                      )}
                      {cert.does_not_expire ? (
                        <Badge variant="secondary" className={cn('text-[10px]', 'h-4', 'px-1.5')}>No Expiry</Badge>
                      ) : cert.expiration_date ? (
                        <p className={cn('text-xs', 'text-muted-foreground')}>
                          Expires {formatIssueDate(cert.expiration_date)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Event Certificates ────────────────────────────────────────────── */}
        {hasEventCerts && (
          <SectionCard icon={Award} title="Event Participation">
            <div className="space-y-3">
              {eventCertificates.map((cert, idx) => (
                <div key={cert.ticketId}>
                  {idx > 0 && <Separator className="mb-3" />}
                  <div className={cn('flex', 'items-center', 'justify-between', 'gap-4')}>
                    <div className={cn('flex-1', 'min-w-0')}>
                      <p className={cn('text-sm', 'font-medium')}>{cert.eventTitle}</p>
                      <div className={cn('flex', 'items-center', 'gap-1', 'text-xs', 'text-muted-foreground', 'mt-0.5')}>
                        <CalendarDays className={cn('h-3', 'w-3')} />
                        {new Date(cert.eventDate).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}
                      </div>
                    </div>
                    <Badge variant="secondary" className={cn('shrink-0', 'gap-1', 'text-xs')}>
                      <Award className={cn('h-3', 'w-3')} />
                      Attended
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

      </div>
    </div>
  );
}
