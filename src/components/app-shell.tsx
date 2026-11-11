"use client";

import { AppHeader } from "@/components/app-header";
import { InstallHint } from "@/components/install-hint";
import { SystemToast } from "@/components/system-toast";
import { useApp } from "@/components/providers";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const TABS = [
  { href: "/painel", label: "Painel" },
  { href: "/treinos", label: "Treinos" },
  { href: "/treinos/novo", label: "Anotar" },
  { href: "/perfil", label: "Perfil" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (app.ready && !app.user) router.replace("/login");
  }, [app.ready, app.user, router]);

  return (
    <div className="stage">
      <div className="phone">
        <AppHeader />
        <div className="phone-main">
          <InstallHint />
          {children}
        </div>
        <SystemToast />
        <nav className="tabbar" aria-label="Principal">
          {TABS.map((tab) => {
            const active = tab.href === "/treinos/novo"
              ? pathname === "/treinos/novo"
              : tab.href === "/treinos"
                ? pathname === "/treinos" || /^\/treinos\/(?!novo$).+/.test(pathname)
                : pathname === tab.href;
            const className = `tab${active ? " tab-active" : ""}${tab.href === "/treinos/novo" ? " tab-new" : ""}`;
            return (
              <Link key={tab.href} href={tab.href} className={className}>
                <strong>{tab.label}</strong>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="stage">
      <div className="phone">
        <AppHeader />
        <div className="phone-main">
          <InstallHint />
          {children}
        </div>
      </div>
    </div>
  );
}
