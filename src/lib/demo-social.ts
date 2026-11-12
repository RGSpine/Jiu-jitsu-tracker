import { techniques } from "@/data/catalog";
import { todayIso } from "@/lib/dates";
import type { DemoDb } from "@/lib/demo-db";
import { buildProgress, epithetFor, titleFor } from "@/lib/progression";
import { socialSnapshot, type SocialRola, type SocialSnapshot } from "@/lib/social";
import {
  canReadTeam,
  cleanQuery,
  memberWeekly,
  projectMember,
  slugify,
  weekTrainingCount,
  type MemberView,
} from "@/lib/teams";
import type {
  Competition,
  CompetitionMatch,
  DiscoverHit,
  PrepPlan,
  Profile,
  TeamMember,
} from "@/lib/types";

export type TeamCard = {
  id: string;
  name: string;
  slug: string;
  inviteCode: string;
  ownerId: string;
  primary: boolean;
  role: TeamMember["role"] | null;
  questTotal: number;
  members: MemberView[];
};

function requireUser(db: DemoDb): Profile {
  const profile = db.profiles.find((item) => item.id === db.currentUserId);
  if (!profile) throw new Error("Entre na sua conta para continuar.");
  return profile;
}

function sessionsOf(db: DemoDb): { userId: string; date: string }[] {
  return db.sessions.map((session) => ({ userId: session.userId, date: session.date }));
}

export function demoTeamCards(db: DemoDb, today = todayIso()): TeamCard[] {
  const me = db.currentUserId;
  if (!me) return [];
  const sessions = sessionsOf(db);
  return (db.teams ?? [])
    .filter((team) => canReadTeam(db.members?.filter((member) => member.teamId === team.id) ?? [], me))
    .map((team) => {
      const members = (db.members ?? []).filter((member) => member.teamId === team.id);
      const activeIds = members.filter((member) => member.status === "active").map((member) => member.userId);
      const mine = members.find((member) => member.userId === me) ?? null;
      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        inviteCode: mine?.status === "active" ? team.inviteCode : "",
        ownerId: team.ownerId,
        primary: db.profiles.find((profile) => profile.id === me)?.primaryTeamId === team.id,
        role: mine?.role ?? null,
        questTotal: mine?.status === "active" ? weekTrainingCount(sessions, activeIds, today) : 0,
        members: members.map((member) => {
          const profile = db.profiles.find((item) => item.id === member.userId);
          const badge = profile ? badgeFor(db, profile, today) : { level: 1, title: "" };
          return projectMember({
            viewerId: me,
            member,
            displayName: profile?.displayName ?? "Atleta",
            belt: profile?.belt ?? null,
            shareProgress: Boolean(profile?.shareProgress),
            level: badge.level,
            title: badge.title,
            weeklyTrainings: memberWeekly(sessions, member.userId, today),
          });
        }),
      };
    });
}

function badgeFor(db: DemoDb, profile: Profile, today: string): { level: number; title: string } {
  const view = buildProgress(progressRolas(db, profile.id), today);
  return { level: view.level, title: titleFor(view, profile.equippedTitleId) ?? epithetFor(view, profile.equippedEpithetId) ?? "" };
}

function progressRolas(db: DemoDb, userId: string): SocialRola[] {
  return db.rolas.filter((rola) => rola.athleteId === userId).map((rola) => ({
    occurredOn: rola.occurredOn,
    modality: rola.modality,
    durationMinutes: rola.durationMinutes,
    sessionId: rola.sessionId,
    pointsFor: rola.pointsAthlete,
    pointsAgainst: rola.pointsPartner,
    result: rola.result,
    opponentUserId: rola.partnerUserId,
    simulation: rola.simulation,
    startedStanding: rola.startedStanding,
    submissionsApplied: rola.actions.filter((action) => action.performer === "self" && action.actionType === "finalizacao").map((action) => ({ id: action.techniqueId })),
    submissionsSuffered: rola.actions.filter((action) => action.performer === "partner" && action.actionType === "finalizacao").map((action) => ({ id: action.techniqueId })),
    techniquesUsed: rola.actions.filter((action) => action.performer === "self" && action.actionType === "tecnica").map((action) => ({
      id: action.techniqueId,
      category: techniques.find((item) => item.id === action.techniqueId)?.category,
    })),
  }));
}

export function demoSocialSnapshot(db: DemoDb, today = todayIso()): SocialSnapshot {
  const me = db.currentUserId;
  if (!me) {
    return socialSnapshot({
      today,
      userId: "",
      teams: [],
      questTotals: [],
      competitions: [],
      matches: [],
      plans: [],
      rolas: [],
      trainingDates: [],
    });
  }
  const cards = demoTeamCards(db, today);
  const teams = (db.teams ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    ownerId: team.ownerId,
    createdAt: team.createdAt,
    members: (db.members ?? []).filter((member) => member.teamId === team.id),
  }));
  return socialSnapshot({
    today,
    userId: me,
    teams,
    questTotals: cards.filter((card) => card.role).map((card) => ({ teamId: card.id, name: card.name, total: card.questTotal })),
    competitions: db.competitions ?? [],
    matches: db.matches ?? [],
    plans: db.plans ?? [],
    rolas: progressRolas(db, me),
    trainingDates: db.sessions.filter((session) => session.userId === me).map((session) => session.date),
  });
}

export function demoSearchAthletes(db: DemoDb, query: string): DiscoverHit[] {
  const me = db.currentUserId;
  const needle = cleanQuery(query).toLowerCase();
  if (needle.length < 2) return [];
  return db.profiles
    .filter((profile) => profile.id !== me && profile.discoverable)
    .filter((profile) =>
      (profile.username ?? "").toLowerCase().includes(needle)
      || profile.displayName.toLowerCase().includes(needle)
      || profile.academy.toLowerCase().includes(needle),
    )
    .slice(0, 8)
    .map((profile) => ({
      id: profile.id,
      username: profile.username ?? "",
      displayName: profile.displayName,
      belt: profile.belt,
      academy: profile.academy,
    }));
}

function uniqueSlug(db: DemoDb, name: string): string {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while ((db.teams ?? []).some((team) => team.slug === slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export function demoCreateTeam(db: DemoDb, name: string, today = todayIso()): DemoDb {
  const me = requireUser(db);
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("Dê um nome à equipe.");
  const team = {
    id: crypto.randomUUID(),
    name: trimmed.slice(0, 60),
    slug: uniqueSlug(db, trimmed),
    ownerId: me.id,
    inviteCode: crypto.randomUUID().slice(0, 8),
    createdAt: today,
  };
  const member: TeamMember = { teamId: team.id, userId: me.id, role: "owner", status: "active", joinedAt: today };
  return {
    ...db,
    teams: [...(db.teams ?? []), team],
    members: [...(db.members ?? []), member],
    profiles: db.profiles.map((profile) => profile.id === me.id && !profile.primaryTeamId ? { ...profile, primaryTeamId: team.id } : profile),
  };
}

export function demoRenameTeam(db: DemoDb, teamId: string, name: string): DemoDb {
  const me = requireUser(db);
  const team = (db.teams ?? []).find((item) => item.id === teamId && item.ownerId === me.id);
  if (!team) throw new Error("Equipe não encontrada.");
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("Dê um nome à equipe.");
  return { ...db, teams: (db.teams ?? []).map((item) => item.id === teamId ? { ...item, name: trimmed.slice(0, 60) } : item) };
}

export function demoInvite(db: DemoDb, teamId: string, userId: string, today = todayIso()): DemoDb {
  const me = requireUser(db);
  const members = db.members ?? [];
  const mine = members.find((member) => member.teamId === teamId && member.userId === me.id && member.status === "active" && (member.role === "owner" || member.role === "admin"));
  const target = db.profiles.find((profile) => profile.id === userId && profile.discoverable);
  if (!mine || !target || userId === me.id) throw new Error("Atleta não encontrado.");
  const existing = members.find((member) => member.teamId === teamId && member.userId === userId);
  if (existing?.status === "active") return db;
  const next: TeamMember = existing
    ? { ...existing, status: "invited" }
    : { teamId, userId, role: "member", status: "invited", joinedAt: today };
  return {
    ...db,
    members: existing
      ? members.map((member) => member.teamId === teamId && member.userId === userId ? next : member)
      : [...members, next],
  };
}

export function demoAcceptInvite(db: DemoDb, teamId: string): DemoDb {
  const me = requireUser(db);
  const members = db.members ?? [];
  const mine = members.find((member) => member.teamId === teamId && member.userId === me.id && (member.status === "invited" || member.status === "requested"));
  if (!mine) throw new Error("Convite não encontrado.");
  return {
    ...db,
    members: members.map((member) => member === mine ? { ...member, status: "active" } : member),
    profiles: db.profiles.map((profile) => profile.id === me.id && !profile.primaryTeamId ? { ...profile, primaryTeamId: teamId } : profile),
  };
}

export function demoJoinCode(db: DemoDb, code: string, today = todayIso()): DemoDb {
  const me = requireUser(db);
  const team = (db.teams ?? []).find((item) => item.inviteCode.toLowerCase() === code.trim().toLowerCase());
  if (!team) throw new Error("Código inválido.");
  const members = db.members ?? [];
  const existing = members.find((member) => member.teamId === team.id && member.userId === me.id);
  const next: TeamMember = existing
    ? { ...existing, status: "active", role: existing.role === "owner" ? "owner" : existing.role }
    : { teamId: team.id, userId: me.id, role: "member", status: "active", joinedAt: today };
  return {
    ...db,
    members: existing ? members.map((member) => member.teamId === team.id && member.userId === me.id ? next : member) : [...members, next],
    profiles: db.profiles.map((profile) => profile.id === me.id && !profile.primaryTeamId ? { ...profile, primaryTeamId: team.id } : profile),
  };
}

export function demoLeaveTeam(db: DemoDb, teamId: string): DemoDb {
  const me = requireUser(db);
  const members = (db.members ?? []).filter((member) => member.teamId === teamId);
  const mine = members.find((member) => member.userId === me.id && member.status === "active");
  if (!mine) throw new Error("Equipe não encontrada.");
  const others = members.filter((member) => member.userId !== me.id && member.status === "active").length;
  if (mine.role === "owner" && others > 0) throw new Error("Passe a equipe antes de sair.");
  if (mine.role === "owner") {
    return {
      ...db,
      teams: (db.teams ?? []).filter((team) => team.id !== teamId),
      members: (db.members ?? []).filter((member) => member.teamId !== teamId),
      profiles: db.profiles.map((profile) => profile.primaryTeamId === teamId ? { ...profile, primaryTeamId: null } : profile),
    };
  }
  return {
    ...db,
    members: (db.members ?? []).filter((member) => !(member.teamId === teamId && member.userId === me.id)),
    profiles: db.profiles.map((profile) => profile.id === me.id && profile.primaryTeamId === teamId ? { ...profile, primaryTeamId: null } : profile),
  };
}

export function demoRemoveMember(db: DemoDb, teamId: string, userId: string): DemoDb {
  const me = requireUser(db);
  const team = (db.teams ?? []).find((item) => item.id === teamId && item.ownerId === me.id);
  if (!team) throw new Error("Equipe não encontrada.");
  if (userId === team.ownerId) throw new Error("O dono permanece na equipe.");
  if (!(db.members ?? []).some((member) => member.teamId === teamId && member.userId === userId)) {
    throw new Error("Membro não encontrado.");
  }
  return {
    ...db,
    members: (db.members ?? []).filter((member) => !(member.teamId === teamId && member.userId === userId)),
    profiles: db.profiles.map((profile) => profile.id === userId && profile.primaryTeamId === teamId ? { ...profile, primaryTeamId: null } : profile),
  };
}

export function demoSetPrimary(db: DemoDb, teamId: string | null): DemoDb {
  const me = requireUser(db);
  if (teamId && !(db.members ?? []).some((member) => member.teamId === teamId && member.userId === me.id && member.status === "active")) {
    throw new Error("Equipe não encontrada.");
  }
  return { ...db, profiles: db.profiles.map((profile) => profile.id === me.id ? { ...profile, primaryTeamId: teamId } : profile) };
}

export function demoSaveCompetition(
  db: DemoDb,
  input: Omit<Competition, "id" | "userId"> & { id?: string; matches: Omit<CompetitionMatch, "id" | "competitionId">[] },
): { db: DemoDb; id: string } {
  const me = requireUser(db);
  const competitions = db.competitions ?? [];
  const existing = input.id ? competitions.find((item) => item.id === input.id && item.userId === me.id) : undefined;
  if (input.id && !existing) throw new Error("Competição não encontrada.");
  const id = existing?.id ?? crypto.randomUUID();
  const competition: Competition = {
    id,
    userId: me.id,
    name: input.name.trim().slice(0, 80),
    organization: input.organization,
    date: input.date,
    city: input.city.trim(),
    modality: input.modality,
    belt: input.belt,
    ageDivision: input.ageDivision,
    weightClass: input.weightClass.trim(),
    absolute: input.absolute,
    absolutePlacement: input.absolutePlacement,
    status: input.status,
    placement: input.placement,
    notes: input.notes.trim(),
  };
  const matches: CompetitionMatch[] = input.matches.slice(0, 30).map((match, index) => ({
    ...match,
    id: crypto.randomUUID(),
    competitionId: id,
    order: index + 1,
    opponentName: match.opponentName.trim().slice(0, 80) || "Adversário",
  }));
  return {
    id,
    db: {
      ...db,
      competitions: existing
        ? competitions.map((item) => item.id === id ? competition : item)
        : [competition, ...competitions],
      matches: [...(db.matches ?? []).filter((match) => match.competitionId !== id), ...matches],
    },
  };
}

export function demoDeleteCompetition(db: DemoDb, id: string): DemoDb {
  const me = requireUser(db);
  if (!(db.competitions ?? []).some((item) => item.id === id && item.userId === me.id)) {
    throw new Error("Competição não encontrada.");
  }
  return {
    ...db,
    competitions: (db.competitions ?? []).filter((item) => item.id !== id),
    matches: (db.matches ?? []).filter((match) => match.competitionId !== id),
    plans: (db.plans ?? []).filter((plan) => plan.competitionId !== id),
  };
}

export function demoSavePlan(db: DemoDb, input: Omit<PrepPlan, "id" | "userId"> & { id?: string }): DemoDb {
  const me = requireUser(db);
  const competition = (db.competitions ?? []).find((item) => item.id === input.competitionId && item.userId === me.id);
  if (!competition) throw new Error("Competição não encontrada.");
  if (input.focusAttributes.length > 3) throw new Error("Escolha no máximo 3 atributos.");
  const plans = db.plans ?? [];
  const id = input.id ?? plans.find((plan) => plan.competitionId === input.competitionId)?.id ?? crypto.randomUUID();
  const plan: PrepPlan = {
    id,
    competitionId: input.competitionId,
    userId: me.id,
    startDate: input.startDate,
    weeklyTrainingTarget: input.weeklyTrainingTarget,
    weeklyRolaTarget: input.weeklyRolaTarget,
    focusAttributes: input.focusAttributes.slice(0, 3),
    targetWeightKg: input.targetWeightKg,
    currentWeightKg: input.currentWeightKg,
    active: input.active,
  };
  return {
    ...db,
    plans: [
      ...plans.filter((item) => item.id !== id).map((item) => plan.active ? { ...item, active: false } : item),
      plan,
    ],
  };
}
