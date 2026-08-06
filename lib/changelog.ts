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
    version: "1.4.18",
    date: "2026-08-06",
    title: "Cleaner Error Messages & Security Hardening",
    badge: "Patch",
    categories: [
      {
        type: "improved",
        items: [
          "All error messages across tests, test creation, and LogicLab are now clear and user-friendly.",
          "Internal technical details are no longer shown in error popups."
        ]
      },
      {
        type: "security",
        items: [
          "Prevented internal database and server details from appearing in error messages."
        ]
      }
    ]
  },
  {
    version: "1.4.17",
    date: "2026-08-05",
    title: "Secure Check-Ins, System Recovery & Test Stability",
    badge: "Patch",
    categories: [
      {
        type: "added",
        items: [
          "Secure QR Check-In: Added token verification to event QR check-ins for verified session attendance.",
          "Automatic System Recovery: Added real-time notifications to safely recover your active session if an update occurs."
        ]
      },
      {
        type: "improved",
        items: [
          "Test Attempt Stability: Enhanced background saving and time synchronization during online test attempts."
        ]
      }
    ]
  },
  {
    version: "1.4.16",
    date: "2026-08-05",
    title: "Local Timezone Accuracy, Instant Navigation & UI Enhancements",
    badge: "Patch",
    categories: [
      {
        type: "improved",
        items: [
          "Automatic Local Timezones: All test dates, event schedules, and Logic Lab challenge timers now dynamically display in your exact local timezone.",
          "Instant Navigation Feedback: Added a zero-delay top progress bar on link clicks for faster, seamless page transitions.",
          "Clutter-Free Events Page: Streamlined the events dashboard with a clean filter sheet so you can find upcoming sessions faster.",
          "Enhanced DateTime Picker: Upgraded date selectors with 12-hour AM/PM formatting and keyboard-friendly controls.",
          "Sidebar Stability: Improved sidebar text rendering so menu items stay crisp and steady when hovering."
        ]
      },
      {
        type: "fixed",
        items: [
          "Fixed a date formatting hydration glitch between server and browser timezones."
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

export const LATEST_VERSION = CHANGELOG_DATA[0]?.version || "1.4.18";
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
