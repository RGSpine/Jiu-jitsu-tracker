import { AppShell } from "@/components/app-shell";

export const instant = false;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
