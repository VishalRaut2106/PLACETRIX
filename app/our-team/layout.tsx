import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Team | Placetrix",
  description: "Meet the team behind PlaceTrix. We are dedicated to providing the best educational assessment platform for students and institutions.",
};

export default function OurTeamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
