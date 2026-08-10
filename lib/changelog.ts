export type ChangelogCategoryType = "added" | "improved" | "fixed" | "security";

export interface ChangelogCategory {
  type: ChangelogCategoryType;
  items: string[];
}

export interface ChangelogItem {
  version: string;
  date: string; // ISO date format YYYY-MM-DD
  title: string;
  badge?: "Major" | "Feature" | "Patch";
  categories: ChangelogCategory[];
}

export const CHANGELOG_DATA: ChangelogItem[] = [
  {
    version: "1.4.22",
    date: "2026-08-11",
    title: "Test Sections (Beta), AI Question Gen & Dashboard Redesign",
    badge: "Feature",
    categories: [
      {
        type: "added",
        items: [
          "Test sections (beta) — organize exam questions into named sections with per-section scoring, accuracy, and time-spent stats on result pages",
          "Redesigned Teacher/Staff/TPO & Admin Home Dashboard with streak stats, activity calendar, and featured cards",
          "Candidate PDF report generation from the user profile page",
          "Expanded AI question generation limit to 60 questions at once with parallel batch processing"
        ]
      },
      {
        type: "improved",
        items: [
          "Section-aware exam navigation — question navigator and view stay in sync during live attempts",
          "Test result breakdown now groups answers by section for easier review",
          "AI question generation reliability with retry logic, deduplication, and better LaTeX/table support",
          "Candidate profile statistics with detailed assigned-test analytics"
        ]
      },
      {
        type: "fixed",
        items: [
          "Section panel is hidden on result pages for tests with no custom sections (no visual noise)",
          "Sync speed improvements during active test attempts"
        ]
      }
    ]
  },
  {
    version: "1.4.21",
    date: "2026-08-10",
    title: "Candidate Dashboard, Event Attendees & Session Fixes",
    badge: "Patch",
    categories: [
      {
        type: "added",
        items: [
          "Attempted tests tab filter on Candidate Assessment Dashboard",
          "Excel export functionality for event attendees with customizable field selection"
        ]
      },
      {
        type: "improved",
        items: [
          "Event attendee management UI with real-time sorting and filtering",
          "Redesigned modular Date & Time picker components",
          "Mobile UI layout and responsiveness on test result pages"
        ]
      },
      {
        type: "fixed",
        items: [
          "False-positive anti-cheat violations on option selection during test attempts",
          "Auth session token refresh race conditions and invalid cookie cleanup"
        ]
      }
    ]
  },
  {
    version: "1.4.20",
    date: "2026-08-07",
    title: "Leaderboard Badges, Profile Redesign & LogicLab Security",
    badge: "Patch",
    categories: [
      {
        type: "added",
        items: [
          "Latest earned badges display on Logic Lab Leaderboard",
          "Dedicated error boundaries across dashboard and test attempt pages"
        ]
      },
      {
        type: "improved",
        items: [
          "Redesigned Candidate Public Profile header and performance submission grid",
          "Logic Lab rate limiting, exponential backoff, and security hardening"
        ]
      }
    ]
  },
  {
    version: "1.4.19",
    date: "2026-08-07",
    title: "AI Model Streaming Fallbacks & What's New Menu",
    badge: "Patch",
    categories: [
      {
        type: "added",
        items: ["What's New changelog modal added to profile menu"]
      },
      {
        type: "improved",
        items: ["Improved AI Assistant and Resume Analyzer speed and fallback reliability"]
      }
    ]
  },
  {
    version: "1.4.18",
    date: "2026-08-06",
    title: "Error Handling & Security",
    badge: "Patch",
    categories: [
      {
        type: "improved",
        items: ["User-friendly error messages across test creation and LogicLab"]
      },
      {
        type: "security",
        items: ["Prevented internal database error details from leaking"]
      }
    ]
  },
  {
    version: "1.4.17",
    date: "2026-08-05",
    title: "Secure Check-Ins & Test Stability",
    badge: "Patch",
    categories: [
      {
        type: "added",
        items: ["Secure QR code event check-ins"]
      },
      {
        type: "improved",
        items: ["Improved test attempt background saving and session stability"]
      }
    ]
  },
  {
    version: "1.4.16",
    date: "2026-08-05",
    title: "Local Timezones & Navigation",
    badge: "Patch",
    categories: [
      {
        type: "improved",
        items: ["Automatic local timezone display for tests, events, and timers"]
      },
      {
        type: "fixed",
        items: ["Bug fixes"]
      }
    ]
  },
  {
    version: "1.4.15",
    date: "2026-08-03",
    title: "AI Assistant & Test-Taking UI",
    badge: "Feature",
    categories: [
      {
        type: "added",
        items: ["AI Assistant for test results and new test-taking environment"]
      }
    ]
  }
];

export const LATEST_VERSION = CHANGELOG_DATA[0]?.version || "1.4.22";
export const STORAGE_KEY_LAST_SEEN_VERSION = "placetrix_last_seen_changelog_version";

export function getLatestChangelog(): ChangelogItem | undefined {
  return CHANGELOG_DATA[0];
}

export function hasUnreadChangelog(): boolean {
  if (typeof window === "undefined") return false;
  const lastSeen = localStorage.getItem(STORAGE_KEY_LAST_SEEN_VERSION);
  return lastSeen !== LATEST_VERSION;
}

export function markChangelogAsRead(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_LAST_SEEN_VERSION, LATEST_VERSION);
}
