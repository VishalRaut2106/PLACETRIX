import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Placetrix",
  description: "Learn how PlaceTrix collects, uses, and protects your personal information. Your data deserves care, not chaos.",
};

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
