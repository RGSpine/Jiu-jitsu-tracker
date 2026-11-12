import { techniques as bundledTechniques } from "@/data/catalog";
import { defaultFederation, federations as bundledFederations, scoringRules as bundledRules } from "@/data/rules";
import { draftFromRola, toPerspective } from "@/lib/perspective";
import { buildPersonalSample } from "@/lib/sample-data";
import { todayIso } from "@/lib/dates";
import type { SystemLogEntry } from "@/lib/progression";
import type {
  Belt,
  Federation,
  Modality,
  PartnerHit,
  PerspectiveRola,
  Profile,
  ScoringRule,
  SessionDraft,
  SessionSummary,
  StoredRola,
  Technique,
} from "@/lib/types";
import { createBrowserSupabase } from "@/lib/supabase/client";

type ActionRow = {
  technique_id: string;
  performer: "self" | "partner";
  action_type: "tecnica" | "finalizacao";
};

type RolaRow = {
  id: string;
  session_id: string;
  athlete_id: string;
  athlete_name: string;
  partner_user_id: string | null;
  partner_name: string;
  occurred_on: string;
  modality: Modality;
  federation_id: string;
  duration_seconds: number;
  result: StoredRola["result"];
  points_athlete: number;
  points_partner: number;
  advantages_athlete: number;
  advantages_partner: number;
  penalties_athlete: number;
  penalties_partner: number;
  actions: ActionRow[] | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  session_date: string;
  modality: Modality;
  notes: string;
  federation_id: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
  belt: Belt | null;
  stripes: number;
  academy: string;
  preferred_modality: Modality;
};

function fail(error: { message: string } | null, message: string): void {
  if (!error) return;
  console.error(error.message);
  throw new Error(message);
}

function mapRola(row: RolaRow): StoredRola {
  return {
    id: row.id,
    sessionId: row.session_id,
    athleteId: row.athlete_id,
    athleteName: row.athlete_name,
    partnerUserId: row.partner_user_id,
    partnerName: row.partner_name,
    occurredOn: row.occurred_on,
    modality: row.modality,
    federationId: row.federation_id,
    durationMinutes: Math.round(row.duration_seconds / 60),
    result: row.result,
    pointsAthlete: row.points_athlete,
    pointsPartner: row.points_partner,
    advantagesAthlete: row.advantages_athlete,
    advantagesPartner: row.advantages_partner,
    penaltiesAthlete: row.penalties_athlete,
    penaltiesPartner: row.penalties_partner,
    actions: (row.actions ?? []).map((action) => ({
      techniqueId: action.technique_id,
      performer: action.performer,
      actionType: action.action_type,
    })),
  };
}

function mapProfile(row: ProfileRow, email: string): Profile {
  return {
    id: row.id,
    email,
    displayName: row.display_name,
    belt: row.belt,
    stripes: row.stripes,
    academy: row.academy ?? "",
    preferredModality: row.preferred_modality,
  };
}

export function browserRepository() {
  const supabase = createBrowserSupabase();

  async function currentUser() {
    const { data, error } = await supabase.auth.getUser();
    fail(error, "Não foi possível confirmar a sessão.");
    return data.user;
  }

  async function loadProfile(): Promise<Profile | null> {
    const user = await currentUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, belt, stripes, academy, preferred_modality")
      .eq("id", user.id)
      .maybeSingle();
    fail(error, "Não foi possível carregar o perfil.");
    if (!data) {
      const displayName = user.email?.split("@")[0] ?? "Atleta";
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email ?? "",
        display_name: displayName,
        academy: "",
        stripes: 0,
        preferred_modality: "nogi",
      });
      fail(insertError, "Não foi possível criar o perfil. Confira se a migration rodou.");
      return {
        id: user.id,
        email: user.email ?? "",
        displayName,
        belt: null,
        stripes: 0,
        academy: "",
        preferredModality: "nogi",
      };
    }
    return mapProfile(data as ProfileRow, user.email ?? "");
  }

  async function loadCatalog(): Promise<{ techniques: Technique[]; rules: ScoringRule[]; federations: Federation[] }> {
    const [techniqueResult, ruleResult, federationResult] = await Promise.all([
      supabase.from("techniques").select("id, name, category, modality, scoring_code, aliases").order("name"),
      supabase.from("scoring_rules").select("federation_id, code, label, points"),
      supabase.from("federations").select("id, name, is_default"),
    ]);
    if (techniqueResult.error || ruleResult.error || federationResult.error || !techniqueResult.data?.length) {
      return { techniques: bundledTechniques, rules: bundledRules, federations: bundledFederations };
    }
    return {
      techniques: techniqueResult.data.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        category: row.category as Technique["category"],
        modality: row.modality as Technique["modality"],
        scoringCode: (row.scoring_code as string | null) ?? null,
        aliases: (row.aliases as string[]) ?? [],
      })),
      rules: (ruleResult.data ?? []).map((row) => ({
        federationId: row.federation_id as string,
        code: row.code as string,
        label: row.label as string,
        points: row.points as number,
      })),
      federations: (federationResult.data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        isDefault: Boolean(row.is_default),
      })),
    };
  }

  async function loadRolas(catalog: Technique[]): Promise<PerspectiveRola[]> {
    const user = await currentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("rolas")
      .select(
        `id, session_id, athlete_id, athlete_name, partner_user_id, partner_name, occurred_on, modality, federation_id, duration_seconds, result, points_athlete, points_partner, advantages_athlete, advantages_partner, penalties_athlete, penalties_partner, actions:rola_actions(technique_id, performer, action_type)`,
      )
      .order("occurred_on", { ascending: false });
    fail(error, "Não foi possível carregar os rolas.");
    return (data as RolaRow[]).flatMap((row) => {
      const perspective = toPerspective(mapRola(row), user.id, catalog);
      return perspective ? [perspective] : [];
    });
  }

  async function loadSessions(catalog: Technique[]): Promise<SessionSummary[]> {
    const user = await currentUser();
    if (!user) return [];
    const [sessionResult, rolas] = await Promise.all([
      supabase
        .from("training_sessions")
        .select("id, user_id, session_date, modality, notes, federation_id")
        .order("session_date", { ascending: false }),
      loadRolas(catalog),
    ]);
    fail(sessionResult.error, "Não foi possível carregar os treinos.");
    return (sessionResult.data as SessionRow[]).map((session) => ({
      id: session.id,
      date: session.session_date,
      modality: session.modality,
      notes: session.notes,
      federationId: session.federation_id,
      rolas: rolas.filter((rola) => rola.sessionId === session.id && rola.ownedByMe),
    }));
  }

  return {
    async user() {
      const user = await currentUser();
      if (!user) return null;
      return { id: user.id, email: user.email ?? "" };
    },
    loadProfile,
    async updateProfile(patch: Pick<Profile, "displayName" | "belt" | "stripes" | "academy" | "preferredModality">) {
      const user = await currentUser();
      if (!user) throw new Error("Entre na sua conta para continuar.");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: patch.displayName.trim(),
          belt: patch.belt,
          stripes: patch.stripes,
          academy: patch.academy.trim(),
          preferred_modality: patch.preferredModality,
        })
        .eq("id", user.id);
      fail(error, "Não foi possível salvar o perfil.");
    },
    async searchPartners(query: string): Promise<PartnerHit[]> {
      const { data, error } = await supabase.rpc("search_partners", { q: query.trim() });
      fail(error, "Não foi possível buscar parceiros.");
      return ((data ?? []) as Array<{
        id: string;
        display_name: string;
        belt: Belt | null;
        academy: string;
        preferred_modality: Modality;
      }>).map((row) => ({
        id: row.id,
        displayName: row.display_name,
        belt: row.belt,
        academy: row.academy ?? "",
        preferredModality: row.preferred_modality,
      }));
    },
    loadCatalog,
    loadRolas,
    loadSessions,
    async loadSession(sessionId: string): Promise<SessionDraft | null> {
      const user = await currentUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, user_id, session_date, modality, notes, federation_id")
        .eq("id", sessionId)
        .maybeSingle();
      fail(error, "Não foi possível abrir o treino.");
      if (!data) return null;
      const session = data as SessionRow;
      const rolaResult = await supabase
        .from("rolas")
        .select(
          `id, session_id, athlete_id, athlete_name, partner_user_id, partner_name, occurred_on, modality, federation_id, duration_seconds, result, points_athlete, points_partner, advantages_athlete, advantages_partner, penalties_athlete, penalties_partner, actions:rola_actions(technique_id, performer, action_type)`,
        )
        .eq("session_id", sessionId);
      fail(rolaResult.error, "Não foi possível abrir os rolas.");
      return {
        id: session.id,
        date: session.session_date,
        modality: session.modality,
        notes: session.notes,
        federationId: session.federation_id,
        rolas: (rolaResult.data as RolaRow[]).map((row) => draftFromRola(mapRola(row))),
      };
    },
    async loadSharedRola(rolaId: string, catalog: Technique[]): Promise<PerspectiveRola | null> {
      const user = await currentUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("rolas")
        .select(
          `id, session_id, athlete_id, athlete_name, partner_user_id, partner_name, occurred_on, modality, federation_id, duration_seconds, result, points_athlete, points_partner, advantages_athlete, advantages_partner, penalties_athlete, penalties_partner, actions:rola_actions(technique_id, performer, action_type)`,
        )
        .eq("id", rolaId)
        .maybeSingle();
      fail(error, "Não foi possível abrir o rola.");
      if (!data) return null;
      return toPerspective(mapRola(data as RolaRow), user.id, catalog);
    },
    async saveSession(draft: SessionDraft): Promise<string> {
      const { data, error } = await supabase.rpc("save_training_session", {
        payload: {
          id: draft.id ?? null,
          date: draft.date,
          modality: draft.modality,
          notes: draft.notes,
          federationId: draft.federationId || defaultFederation().id,
          rolas: draft.rolas.map((rola) => ({
            durationMinutes: rola.durationMinutes,
            partnerUserId: rola.partnerUserId,
            partnerName: rola.partnerName,
            result: rola.result,
            pointsFor: rola.pointsFor,
            pointsAgainst: rola.pointsAgainst,
            advantagesFor: rola.advantagesFor,
            advantagesAgainst: rola.advantagesAgainst,
            penaltiesFor: rola.penaltiesFor,
            penaltiesAgainst: rola.penaltiesAgainst,
            techniquesUsed: rola.techniquesUsed,
            submissionsApplied: rola.submissionsApplied,
            submissionsSuffered: rola.submissionsSuffered,
          })),
        },
      });
      if (error) {
        console.error(error.message);
        throw new Error(error.message || "Não foi possível salvar o treino.");
      }
      return String(data);
    },
    async deleteSession(sessionId: string) {
      const { error } = await supabase.rpc("delete_training_session", { sid: sessionId });
      fail(error, "Não foi possível excluir o treino.");
    },
    async loadSample(profile: Profile) {
      const catalog = await loadCatalog();
      const sessions = await loadSessions(catalog.techniques);
      for (const session of sessions) {
        const { error } = await supabase.rpc("delete_training_session", { sid: session.id });
        fail(error, "Não foi possível substituir os treinos de exemplo.");
      }
      const sample = buildPersonalSample({
        userId: profile.id,
        userName: profile.displayName,
        today: todayIso(),
        seed: 4242,
        idOffset: 100,
      });
      for (const session of sample.sessions) {
        const rolas = sample.rolas.filter((rola) => rola.sessionId === session.id);
        const { error } = await supabase.rpc("save_training_session", {
          payload: {
            id: null,
            date: session.date,
            modality: session.modality,
            notes: session.notes,
            federationId: session.federationId,
            rolas: rolas.map((rola) => {
              const draft = draftFromRola(rola);
              return {
                durationMinutes: draft.durationMinutes,
                partnerUserId: null,
                partnerName: draft.partnerName,
                result: draft.result,
                pointsFor: draft.pointsFor,
                pointsAgainst: draft.pointsAgainst,
                advantagesFor: draft.advantagesFor,
                advantagesAgainst: draft.advantagesAgainst,
                penaltiesFor: draft.penaltiesFor,
                penaltiesAgainst: draft.penaltiesAgainst,
                techniquesUsed: draft.techniquesUsed,
                submissionsApplied: draft.submissionsApplied,
                submissionsSuffered: draft.submissionsSuffered,
              };
            }),
          },
        });
        fail(error, "Não foi possível gravar os treinos de exemplo.");
      }
    },
    async saveProgress(patch: {
      shareProgress: boolean;
      equippedTitleId: string | null;
      equippedEpithetId: string | null;
      publicLevel: number;
      publicTitle: string;
      publicEpithet: string;
      seenUnlocks: string[];
    }) {
      const user = await currentUser();
      if (!user) throw new Error("Entre na sua conta para continuar.");
      const { error } = await supabase.from("progression").upsert({
        user_id: user.id,
        share_progress: patch.shareProgress,
        equipped_title_id: patch.equippedTitleId,
        equipped_epithet_id: patch.equippedEpithetId,
        public_level: patch.publicLevel,
        public_title: patch.publicTitle,
        public_epithet: patch.publicEpithet,
        seen_unlocks: patch.seenUnlocks,
      });
      fail(error, "Não foi possível salvar a progressão.");
    },
    async publicBadge(userId: string): Promise<{ level: number; title: string; epithet: string } | null> {
      const { data, error } = await supabase
        .from("progression")
        .select("public_level, public_title, public_epithet, share_progress")
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !data?.share_progress) return null;
      return {
        level: data.public_level as number,
        title: (data.public_title as string) ?? "",
        epithet: (data.public_epithet as string) ?? "",
      };
    },
    async syncLog(entries: SystemLogEntry[]): Promise<SystemLogEntry[]> {
      const user = await currentUser();
      if (!user) return [];
      const { data: settings } = await supabase.from("progression").select("log_bootstrapped").eq("user_id", user.id).maybeSingle();
      const ready = Boolean(settings?.log_bootstrapped);
      const { data: existing } = await supabase.from("system_log").select("id").eq("user_id", user.id);
      const known = new Set((existing ?? []).map((row) => row.id as string));
      const novel = entries.filter((entry) => !known.has(entry.id));
      if (novel.length) {
        const { error } = await supabase.from("system_log").insert(novel.map((entry) => ({
          id: entry.id,
          user_id: user.id,
          kind: entry.kind,
          body: entry.body,
          occurred_on: entry.occurredOn,
          read_at: ready ? null : new Date().toISOString(),
        })));
        fail(error, "Não foi possível gravar o registro.");
      }
      if (!ready) {
        const { error } = await supabase.from("progression").upsert({ user_id: user.id, log_bootstrapped: true });
        fail(error, "Não foi possível gravar o registro.");
        const last = entries.at(-1);
        if (last) await supabase.from("system_log").update({ read_at: null }).eq("user_id", user.id).eq("id", last.id);
        return [];
      }
      return novel;
    },
    async loadLog() {
      const user = await currentUser();
      if (!user) return [];
      const { data, error } = await supabase.from("system_log").select("id, kind, body, occurred_on, read_at").eq("user_id", user.id).order("occurred_on");
      fail(error, "Não foi possível abrir o registro.");
      return (data ?? []).map((row) => ({
        id: row.id as string,
        kind: row.kind as SystemLogEntry["kind"],
        body: row.body as string,
        occurredOn: row.occurred_on as string,
        read: Boolean(row.read_at),
      }));
    },
    async markLogRead() {
      const user = await currentUser();
      if (!user) return;
      const { error } = await supabase.from("system_log").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
      fail(error, "Não foi possível marcar o registro.");
    },
    async signIn(email: string, password: string) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message);
    },
    async signUp(input: {
      email: string;
      password: string;
      displayName: string;
      belt: Belt | null;
      stripes: number;
      academy: string;
      preferredModality: Modality;
    }) {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            display_name: input.displayName.trim(),
            belt: input.belt ?? "",
            stripes: String(input.stripes),
            academy: input.academy.trim(),
            preferred_modality: input.preferredModality,
          },
        },
      });
      if (error) throw new Error(error.message);
      return { needsEmailConfirmation: !data.session };
    },
    async sendMagicLink(email: string) {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      fail(error, "Não foi possível sair.");
    },
  };
}

export type Repository = ReturnType<typeof browserRepository>;
