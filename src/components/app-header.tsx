"use client";

import { Mark } from "@/components/mark";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="brand-row">
        <Mark size={36} />
        <span className="word">TATAME</span>
      </div>
      <ThemeToggle />
    </header>
  );
}
