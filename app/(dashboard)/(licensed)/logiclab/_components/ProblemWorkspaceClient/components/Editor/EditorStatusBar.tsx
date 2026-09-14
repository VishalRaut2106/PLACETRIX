"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface EditorStatusBarProps {
  saveStatus: "Saved" | "Saving..." | "Unsaved" | "";
  cursorPos: { line: number; col: number };
  languageName?: string;
}

export function EditorStatusBar({
  saveStatus,
  cursorPos,
  languageName,
}: EditorStatusBarProps) {
  return (
    <footer className="flex items-center justify-between px-3 py-1 shrink-0 text-[11px] text-muted-foreground font-medium select-none bg-muted/30 border-t border-border/50">
      <div className="flex items-center gap-2">
        <span>{saveStatus || "Saved"}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </span>
      </div>
    </footer>
  );
}
