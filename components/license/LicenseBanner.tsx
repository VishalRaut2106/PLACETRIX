"use client";

import { useLicense } from "@/components/license/LicenseProvider";
import { AlertTriangle, Clock, XCircle, ShieldOff, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type BannerVariant = "expired" | "pending" | "none" | "revoked";

interface BannerConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  className: string;
}

const BANNER_CONFIG: Record<BannerVariant, BannerConfig> = {
  expired: {
    icon: <XCircle className="h-4 w-4 shrink-0 text-destructive" />,
    title: "License Expired",
    description:
      "Your college's Placetrix license has expired. Please contact Placetrix to renew access.",
    className:
      "border-destructive/20 bg-destructive/10 text-destructive dark:border-destructive/30 dark:bg-destructive/10",
  },
  pending: {
    icon: <Clock className="h-4 w-4 shrink-0 text-warning" />,
    title: "License Pending",
    description:
      "Your college's Placetrix license is pending activation. Contact your Placetrix representative to get started.",
    className:
      "border-warning/20 bg-warning/10 text-warning dark:border-warning/30 dark:bg-warning/10",
  },
  none: {
    icon: <ShieldOff className="h-4 w-4 shrink-0 text-warning" />,
    title: "No License",
    description:
      "Your college does not have an active Placetrix license. Contact Placetrix to get set up.",
    className:
      "border-warning/20 bg-warning/10 text-warning dark:border-warning/30 dark:bg-warning/10",
  },

  revoked: {
    icon: <XCircle className="h-4 w-4 shrink-0 text-destructive" />,
    title: "License Revoked",
    description:
      "Your college's Placetrix license has been manually suspended or revoked. Please contact support.",
    className:
      "border-destructive/20 bg-destructive/10 text-destructive dark:border-destructive/30 dark:bg-destructive/10",
  },
};

export function LicenseBanner() {
  const { license, user, isAdmin } = useLicense();

  if (isAdmin) return null;

  let variant: BannerVariant | null = null;

  // 1. License Check
  if (!license || license.status !== "active") {
    const status = license?.status ?? null;
    if (status === "expired") {
      variant = "expired";
    } else if (status === "revoked") {
      variant = "revoked";
    } else if (status === "pending") {
      variant = "pending";
    } else {
      variant = "none";
    }
  } 


  if (!variant || !BANNER_CONFIG[variant]) return null;

  const config = BANNER_CONFIG[variant];

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-3.5 text-sm",
        config.className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {config.icon}
        <div className="min-w-0">
          <p className="font-semibold leading-none">{config.title}</p>
          <p className="mt-1 text-xs opacity-80 leading-relaxed">{config.description}</p>
        </div>
      </div>
    </div>
  );
}
