import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Placetrix",
  description: "Read the Terms and Conditions for using PlaceTrix. A few ground rules, minus the dramatic legal fog.",
};

export default function TermsOfServiceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
