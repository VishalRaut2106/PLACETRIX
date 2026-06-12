import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center | Placetrix",
  description: "Get help and support for using PlaceTrix. Find answers to frequently asked questions and learn how to get the most out of our educational platform.",
};

export default function HelpCenterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
