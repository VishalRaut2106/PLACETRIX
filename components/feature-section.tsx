import { cn } from "@/lib/utils";
import type React from "react";
import {
  ClipboardCheck, BellRing, Briefcase,
  CalendarDays, BarChart3, Users,
} from "lucide-react";

type FeatureType = {
  title: string;
  icon: React.ReactNode;
  description: string;
};

const features: FeatureType[] = [
  {
    title: "Precision Practice",
    icon: <ClipboardCheck />,
    description:
      "Access thousands of industry-standard mock tests designed to mimic real-world aptitude and technical rounds.",
  },
  {
    title: "Real-time Drive Updates",
    icon: <BellRing />,
    description:
      "Stay ahead of the curve with instant notifications on upcoming campus drives, eligibility criteria, and deadlines.",
  },
  {
    title: "Career Gateway",
    icon: <Briefcase />,
    description:
      "Discover off-campus opportunities and job openings curated specifically for freshers and graduating students.",
  },
  {
    title: "Expert-Led Events",
    icon: <CalendarDays />,
    description:
      "Join live webinars, resume-building workshops, and mock interview sessions hosted by industry veterans.",
  },
  {
    title: "Progress Insights",
    icon: <BarChart3 />,
    description:
      "Track your performance across different subjects with detailed analytics to identify and bridge your skill gaps.",
  },
  {
    title: "Individual & Bulk Plans",
    icon: <Users />,
    description:
      "Scalable solutions for solo learners or entire institutions through our seamless license management system.",
  },
];

export function FeatureSection() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      {/* Section heading */}
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance font-medium text-2xl md:text-4xl lg:text-5xl">
          Train. Track. Triumph.
        </h2>
        <p className="mt-4 text-balance text-muted-foreground text-sm md:text-base">
          Everything you need to practice, prepare, and get placed.
        </p>
      </div>

      {/* Two-column editorial list */}
      <div className="mt-12 grid grid-cols-1 gap-x-16 border-t border-border md:grid-cols-2">
        {features.map((feature, i) => (
          <FeatureRow
            key={feature.title}
            feature={feature}
            last={
              features.length % 2 === 0
                ? i >= features.length - 2
                : i === features.length - 1
            }
          />
        ))}
      </div>
    </div>
  );
}

function FeatureRow({
  feature,
  last,
  className,
}: {
  feature: FeatureType;
  last: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-5 py-8",
        !last && "border-b border-border",
        className
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0 [&_svg]:size-5 [&_svg]:text-foreground/60">
        {feature.icon}
      </div>

      {/* Text */}
      <div className="space-y-1">
        <h3 className="font-medium text-sm md:text-base">{feature.title}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed md:text-sm">
          {feature.description}
        </p>
      </div>
    </div>
  );
}