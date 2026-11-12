import { techniques } from "@/data/catalog";
import { buildProgress, epithetFor, titleFor, type SystemLogEntry } from "@/lib/progression";
import { defaultFederation } from "@/data/rules";
import { todayIso } from "@/lib/dates";
import { draftFromRola, toPerspective } from "@/lib/perspective";
import {
  buildIncomingFromPartner,
  buildPersonalSample,
  DEMO_ANA_ID,
  DEMO_LUCAS_ID,
  DEMO_ROBERTO_ID,
} from "@/lib/sample-data";
import type {
  Belt,
  Modality,
  PartnerHit,
  PerspectiveRola,
  Profile,
  SessionDraft,
  SessionSummary,
  StoredRola,
  StoredSession,
} from "@/lib/types";
import { actionsFromDraft } from "@/lib/perspective";

export const DEMO_STORAGE_KEY = "tatame.demo.v1";

export type DemoDb = {
  version: 1;
  currentUserId: string | null;
  profiles: Profile[];
  sessions: StoredSession[];
  rolas: StoredRola[];
  systemLogs?: Record<string, { ready: boolean; entries: SystemLogEntry[] }>;
};

const SEED_PROFILES: Profile[] = [
  {
    id: DEMO_ROBERTO_ID,
    email: "roberto@tatame.dev",
    displayName: "Roberto Almeida",
    belt: "roxa",
    stripes: 2,
    academy: "Academia Sul",
    preferredModality: "nogi",
    shareProgress: true,
  },
  {
    id: DEMO_ANA_ID,
    email: "ana@tatame.dev",
    displayName: "Ana Souza",
    belt: "azul",
    stripes: 3,
    academy: "Academia Sul",
    preferredModality: "nogi",
  },
  {
    id: DEMO_LUCAS_ID,
    email: "lucas@tatame.dev",
    displayName: "Lucas Pereira",
    belt: "marrom",
    stripes: 1,
    academy: "CT Nova Guarda",
    preferredModality: "gi",
  },
];

export function createSeed(today = todayIso()): DemoDb {
  const roberto = buildPersonalSample({
    userId: DEMO_ROBERTO_ID,
    userName: "Roberto Almeida",
    today,
    seed: 202611,
    idOffset: 100,
    linkedPartner: { id: DEMO_ANA_ID, name: "Ana Souza" },
    linkEvery: 5,
  });
  const incoming = buildIncomingFromPartner(today);
  return {
    version: 1,
    currentUserId: null,
    profiles: SEED_PROFILES.map((profile) => ({ ...profile })),
    sessions: [...roberto.sessions, ...incoming.sessions],
    rolas: [...roberto.rolas, ...incoming.rolas],
  };
}

export function loadDemoDb(): DemoDb {
  if (typeof window === "undefined") return createSeed();
  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) return createSeed();
  try {
    const parsed = JSON.parse(raw) as DemoDb;
    if (parsed.version !== 1 || !Array.isArray(parsed.profiles)) return createSeed();
    return {
      ...parsed,
      profiles: parsed.profiles.map((profile) => ({
        ...profile,
        shareProgress: profile.shareProgress ?? profile.id === DEMO_ROBERTO_ID,
      })),
    };
  } catch {
    return createSeed();
  }
}

export function saveDemoDb(db: DemoDb): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
}

function requireUser(db: DemoDb): Profile {
  const profile = db.profiles.find((item) => item.id === db.currentUserId);
  if (!profile) throw new Error("Entre na sua conta para continuar.");
  return profile;
}

export function demoProfile(db: DemoDb): Profile | null {
  return db.profiles.find((item) => item.id === db.currentUserId) ?? null;
}

export function demoSignIn(db: DemoDb, email: string): DemoDb {
  const profile = db.profiles.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
  if (!profile) throw new Error("Não encontramos essa conta na demonstração.");
  return { ...db, currentUserId: profile.id };
}

export function demoSignUp(
  db: DemoDb,
  input: {
    email: string;
    displayName: string;
    belt: Belt | null;
    stripes: number;
    academy: string;
    preferredModality: Modality;
  },
): DemoDb {
  const email = input.email.trim().toLowerCase();
  if (db.profiles.some((item) => item.email.toLowerCase() === email)) {
    throw new Error("Já existe uma conta com esse e-mail.");
  }
  const profile: Profile = {
    id: crypto.randomUUID(),
    email,
    displayName: input.displayName.trim(),
    belt: input.belt,
    stripes: input.stripes,
    academy: input.academy.trim(),
    preferredModality: input.preferredModality,
  };
  return { ...db, currentUserId: profile.id, profiles: [...db.profiles, profile] };
}

export function demoSyncLog(db: DemoDb, userId: string, fresh: SystemLogEntry[]): { db: DemoDb; announced: SystemLogEntry[] } {
  const current = db.systemLogs?.[userId] ?? { ready: false, entries: [] };
  const known = new Set(current.entries.map((entry) => entry.id));
  const novel = fresh.filter((entry) => !known.has(entry.id));
  if (!current.ready) {
    const entries = fresh.map((entry, index) => ({ ...entry, read: index !== fresh.length - 1 }));
    return { db: { ...db, systemLogs: { ...db.systemLogs, [userId]: { ready: true, entries } } }, announced: [] };
  }
  return {
    db: { ...db, systemLogs: { ...db.systemLogs, [userId]: { ready: true, entries: [...current.entries, ...novel.map((entry) => ({ ...entry, read: false }))] } } },
    announced: novel,
  };
}

export function demoMarkLogRead(db: DemoDb, userId: string): DemoDb {
  const current = db.systemLogs?.[userId];
  if (!current) return db;
  return {
    ...db,
    systemLogs: {
      ...db.systemLogs,
      [userId]: { ...current, entries: current.entries.map((entry) => ({ ...entry, read: true })) },
    },
  };
}

export function demoLog(db: DemoDb, userId: string): SystemLogEntry[] {
  return db.systemLogs?.[userId]?.entries ?? [];
}

export function demoUpdateProgress(
  db: DemoDb,
  patch: { shareProgress?: boolean; equippedTitleId?: string | null; equippedEpithetId?: string | null },
): DemoDb {
  const me = requireUser(db);
  return {
    ...db,
    profiles: db.profiles.map((profile) => profile.id === me.id ? { ...profile, ...patch } : profile),
  };
}

export function demoPublicBadge(db: DemoDb, userId: string, today: string): { level: number; title: string; epithet: string } | null {
  const profile = db.profiles.find((item) => item.id === userId);
  if (!profile?.shareProgress) return null;
  const view = buildProgress(db.rolas.filter((rola) => rola.athleteId === userId).map((rola) => ({
    occurredOn: rola.occurredOn,
    modality: rola.modality,
    durationMinutes: rola.durationMinutes,
    sessionId: rola.sessionId,
    pointsFor: rola.pointsAthlete,
    pointsAgainst: rola.pointsPartner,
    result: rola.result,
    opponentUserId: rola.partnerUserId,
    submissionsApplied: rola.actions.filter((action) => action.performer === "self" && action.actionType === "finalizacao").map((action) => ({ id: action.techniqueId })),
    submissionsSuffered: rola.actions.filter((action) => action.performer === "partner" && action.actionType === "finalizacao").map((action) => ({ id: action.techniqueId })),
    techniquesUsed: rola.actions.filter((action) => action.performer === "self" && action.actionType === "tecnica").map((action) => ({ id: action.techniqueId })),
  })), today);
  return { level: view.level, title: titleFor(view, profile.equippedTitleId) ?? "", epithet: epithetFor(view, profile.equippedEpithetId) ?? "" };
}

export function demoUpdateProfile(
  db: DemoDb,
  patch: Pick<Profile, "displayName" | "belt" | "stripes" | "academy" | "preferredModality">,
): DemoDb {
  const me = requireUser(db);
  return {
    ...db,
    profiles: db.profiles.map((profile) =>
      profile.id === me.id
        ? {
            ...profile,
            displayName: patch.displayName.trim(),
            belt: patch.belt,
            stripes: patch.stripes,
            academy: patch.academy.trim(),
            preferredModality: patch.preferredModality,
          }
        : profile,
    ),
    rolas: db.rolas.map((rola) =>
      rola.athleteId === me.id ? { ...rola, athleteName: patch.displayName.trim() } : rola,
    ),
  };
}

export function demoSearch(db: DemoDb, query: string): PartnerHit[] {
  const me = db.currentUserId;
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return db.profiles
    .filter((profile) => profile.id !== me)
    .filter(
      (profile) =>
        profile.displayName.toLowerCase().includes(needle) || profile.email.toLowerCase().includes(needle),
    )
    .slice(0, 8)
    .map((profile) => ({
      id: profile.id,
      displayName: profile.displayName,
      belt: profile.belt,
      academy: profile.academy,
      preferredModality: profile.preferredModality,
    }));
}

function rolaFromDraft(session: StoredSession, draft: SessionDraft["rolas"][number], athlete: Profile): StoredRola {
  return {
    id: crypto.randomUUID(),
    sessionId: session.id,
    athleteId: athlete.id,
    athleteName: athlete.displayName,
    partnerUserId: draft.partnerUserId,
    partnerName: draft.partnerName.trim(),
    occurredOn: session.date,
    modality: session.modality,
    federationId: session.federationId,
    durationMinutes: draft.durationMinutes,
    result: draft.result,
    pointsAthlete: draft.pointsFor,
    pointsPartner: draft.pointsAgainst,
    advantagesAthlete: draft.advantagesFor,
    advantagesPartner: draft.advantagesAgainst,
    penaltiesAthlete: draft.penaltiesFor,
    penaltiesPartner: draft.penaltiesAgainst,
    actions: actionsFromDraft(draft),
  };
}

export function demoSaveSession(db: DemoDb, draft: SessionDraft): { db: DemoDb; id: string } {
  const me = requireUser(db);
  if (draft.rolas.some((rola) => rola.partnerUserId === me.id)) {
    throw new Error("Você não pode registrar um rola contra si mesmo.");
  }
  const existing = draft.id ? db.sessions.find((session) => session.id === draft.id) : undefined;
  if (draft.id && (!existing || existing.userId !== me.id)) {
    throw new Error("Treino não encontrado ou sem permissão.");
  }
  const id = existing?.id ?? crypto.randomUUID();
  const session: StoredSession = {
    id,
    userId: me.id,
    date: draft.date,
    modality: draft.modality,
    notes: draft.notes.trim(),
    federationId: draft.federationId || defaultFederation().id,
  };
  const rolas = draft.rolas.map((rola) => {
    const stored = rolaFromDraft(session, rola, me);
    if (stored.partnerUserId) {
      const partner = db.profiles.find((profile) => profile.id === stored.partnerUserId);
      if (!partner) throw new Error("Parceiro não encontrado.");
      if (!stored.partnerName) stored.partnerName = partner.displayName;
    }
    return stored;
  });
  return {
    id,
    db: {
      ...db,
      sessions: existing
        ? db.sessions.map((item) => (item.id === id ? session : item))
        : [session, ...db.sessions],
      rolas: [...db.rolas.filter((rola) => rola.sessionId !== id), ...rolas],
    },
  };
}

export function demoDeleteSession(db: DemoDb, sessionId: string): DemoDb {
  const me = requireUser(db);
  const session = db.sessions.find((item) => item.id === sessionId);
  if (!session || session.userId !== me.id) throw new Error("Treino não encontrado ou sem permissão.");
  return {
    ...db,
    sessions: db.sessions.filter((item) => item.id !== sessionId),
    rolas: db.rolas.filter((rola) => rola.sessionId !== sessionId),
  };
}

export function demoPerspectives(db: DemoDb): PerspectiveRola[] {
  const me = db.currentUserId;
  if (!me) return [];
  return db.rolas
    .map((rola) => toPerspective(rola, me, techniques))
    .filter((rola): rola is PerspectiveRola => rola !== null)
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id));
}

export function demoSessions(db: DemoDb): SessionSummary[] {
  const me = db.currentUserId;
  if (!me) return [];
  const perspectives = demoPerspectives(db);
  return db.sessions
    .filter((session) => session.userId === me)
    .map((session) => ({
      id: session.id,
      date: session.date,
      modality: session.modality,
      notes: session.notes,
      federationId: session.federationId,
      rolas: perspectives.filter((rola) => rola.sessionId === session.id && rola.ownedByMe),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function demoSessionDraft(db: DemoDb, sessionId: string): SessionDraft | null {
  const me = requireUser(db);
  const session = db.sessions.find((item) => item.id === sessionId && item.userId === me.id);
  if (!session) return null;
  const rolas = db.rolas.filter((rola) => rola.sessionId === session.id).map(draftFromRola);
  return {
    id: session.id,
    date: session.date,
    modality: session.modality,
    notes: session.notes,
    federationId: session.federationId,
    rolas,
  };
}

export function demoSharedRola(db: DemoDb, rolaId: string): PerspectiveRola | null {
  const me = db.currentUserId;
  if (!me) return null;
  const stored = db.rolas.find((rola) => rola.id === rolaId);
  if (!stored) return null;
  return toPerspective(stored, me, techniques);
}

export function demoLoadSample(db: DemoDb, today = todayIso()): DemoDb {
  const me = requireUser(db);
  if (me.id === DEMO_ROBERTO_ID) {
    const fresh = createSeed(today);
    return { ...fresh, currentUserId: me.id };
  }
  const sample = buildPersonalSample({
    userId: me.id,
    userName: me.displayName,
    today,
    seed: me.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0),
    idOffset: 5000,
  });
  return {
    ...db,
    sessions: [...db.sessions.filter((session) => session.userId !== me.id), ...sample.sessions],
    rolas: [...db.rolas.filter((rola) => rola.athleteId !== me.id), ...sample.rolas],
  };
}
