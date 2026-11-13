"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tatame.theme";

type ExplicitTheme = "light" | "dark";

function systemTheme(): ExplicitTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: ExplicitTheme | null): ExplicitTheme {
  const root = document.documentElement;
  if (theme) root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");
  const resolved = theme ?? systemTheme();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#000000" : "#ffffff");
  return resolved;
}

export function ThemeToggle() {
  const [resolved, setResolved] = useState<ExplicitTheme | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const explicit = saved === "light" || saved === "dark" ? saved : null;
    const frame = window.requestAnimationFrame(() => setResolved(applyTheme(explicit)));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = window.localStorage.getItem(STORAGE_KEY);
      if (current !== "light" && current !== "dark") setResolved(applyTheme(null));
    };
    media.addEventListener("change", onChange);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener("change", onChange);
    };
  }, []);

  const label = resolved === "dark" ? "Escuro" : resolved === "light" ? "Claro" : "Tema";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={resolved === "dark" ? "Usar tema claro" : "Usar tema escuro"}
      onClick={() => {
        const next: ExplicitTheme = (resolved ?? systemTheme()) === "dark" ? "light" : "dark";
        window.localStorage.setItem(STORAGE_KEY, next);
        setResolved(applyTheme(next));
      }}
    >
      {label}
    </button>
  );
}
