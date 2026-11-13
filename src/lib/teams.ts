import { addDays, inRange, startOfWeek } from "@/lib/dates";
import type { SystemLogEntry } from "@/lib/progression";
import type { MemberStatus, TeamMember } from "@/lib/types";

export const TEAM_WEEK_GOAL = 20;
export const TEAM_QUEST_XP = 25;

const VISIBLE: MemberStatus[] = ["active", "invited", "requested"];

export function canReadTeam(members: Pick<TeamMember, "userId" | "status">[], viewerId: string): boolean {
  return members.some((member) => member.userId === viewerId && VISIBLE.includes(member.status));
}

export function fundadorUnlocked(teams: { ownerId: string; members: Pick<TeamMember, "status">[] }[], userId: string): boolean {
  return teams.some((team) => team.ownerId === userId && team.members.filter((member) => member.status === "active").length >= 3);
}

export function weekTrainingCount(sessions: { userId: string; date: string }[], memberIds: string[], today: string): number {
  const start = startOfWeek(today);
  const end = addDays(start, 6);
  const ids = new Set(memberIds);
  return sessions.filter((session) => ids.has(session.userId) && inRange(session.date, start, end)).length;
}

export function memberWeekly(
  sessions: { userId: string; date: string }[],
  userId: string,
  today: string,
): number {
  return weekTrainingCount(sessions, [userId], today);
}

export type MemberView = {
  userId: string;
  role: TeamMember["role"];
  status: MemberStatus;
  displayName: string;
  belt: string | null;
  level: number | null;
  title: string | null;
  weeklyTrainings: number | null;
};

export function projectMember(input: {
  viewerId: string;
  member: TeamMember;
  displayName: string;
  belt: string | null;
  shareProgress: boolean;
  level: number;
  title: string;
  weeklyTrainings: number;
}): MemberView {
  const self = input.member.userId === input.viewerId;
  const open = self || input.shareProgress;
  return {
    userId: input.member.userId,
    role: input.member.role,
    status: input.member.status,
    displayName: input.displayName,
    belt: input.belt,
    level: open ? input.level : null,
    title: open && input.title ? input.title : null,
    weeklyTrainings: open ? input.weeklyTrainings : null,
  };
}

export function teamQuestEvent(teamId: string, teamName: string, today: string, total: number): SystemLogEntry | null {
  if (total < TEAM_WEEK_GOAL) return null;
  const week = startOfWeek(today);
  return {
    id: `equipe-missao:${teamId}:${week}`,
    kind: "equipe",
    occurredOn: today,
    body: `[SISTEMA] A equipe ${teamName} fechou a missão: ${TEAM_WEEK_GOAL} treinos nesta semana.`,
  };
}

export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "equipe";
}

export function cleanQuery(query: string): string {
  return query.trim().replace(/[%_]/g, "").slice(0, 40);
}
