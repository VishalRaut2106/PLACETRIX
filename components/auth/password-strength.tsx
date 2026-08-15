"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password?: string;
  className?: string;
}

export function getPasswordStrength(password: string): {
  score: number;
  label: "Weak" | "Fair" | "Strong";
  colorClass: string;
} {
  if (!password) return { score: 0, label: "Weak", colorClass: "text-rose-500" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) {
    return { score, label: "Weak", colorClass: "text-rose-500" };
  }
  if (score <= 3) {
    return { score, label: "Fair", colorClass: "text-amber-500" };
  }
  return { score, label: "Strong", colorClass: "text-emerald-500" };
}

export function PasswordStrength({ password = "", className }: PasswordStrengthProps) {
  if (!password) return null;

  const { score, label, colorClass } = getPasswordStrength(password);

  return (
    <div className={cn("space-y-1.5 pt-0.5", className)}>
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => {
          const isActive = step <= score;
          let color = "bg-muted";
          if (isActive) {
            if (score <= 1) color = "bg-rose-500";
            else if (score <= 3) color = "bg-amber-500";
            else color = "bg-emerald-500";
          }
          return (
            <div
              key={step}
              className={cn("rounded-full transition-all duration-300", color)}
            />
          );
        })}
      </div>
      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
        <span>Password strength</span>
        <span className={colorClass}>{label}</span>
      </div>
    </div>
  );
}
