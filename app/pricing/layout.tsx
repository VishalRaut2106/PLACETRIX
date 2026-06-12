import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | Placetrix",
  description: "PlaceTrix is currently free for all. Start using PlaceTrix today without paying anything. When paid plans are introduced in the future, we'll notify users clearly and in advance.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
