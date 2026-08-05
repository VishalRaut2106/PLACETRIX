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
    version: "1.4.16",
    date: "2026-08-05",
    title: "Pro DateTimePicker, Target Cohort Combobox & UTC Standardization",
    badge: "Patch",
    categories: [
      {
        type: "improved",
        items: [
          "Upgraded DateTimePicker with keyboard-first navigation and 12-hour AM/PM format support.",
          "Enhanced target cohort selector with a searchable, multi-select dropdown combobox across all creation forms.",
          "Standardized header typography, fonts, and subtitle styling across creation & editing pages.",
          "Standardized all database operations to UTC timestamps with dynamic browser local timezone display.",
          "Improved sidebar button hover state and font weight stability."
        ]
      },
      {
        type: "fixed",
        items: [
          "Resolved date hydration mismatch between server-rendered and client-rendered local date formatting."
        ]
      }
    ]
  },
  {
    version: "1.4.15",
    date: "2026-08-03",
    title: "AI Assistant & New Test-Taking Environment",
    badge: "Feature",
    categories: [
      {
        type: "added",
        items: [
          "AI Assistant on Test Result pages for instant explanations and personalized feedback.",
          "New test-taking interface with smooth question navigation and instant submission."
        ]
      }
    ]
  }
];

export const LATEST_VERSION = CHANGELOG_DATA[0]?.version || "1.4.16";
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
