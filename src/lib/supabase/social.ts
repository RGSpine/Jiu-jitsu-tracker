import { todayIso } from "@/lib/dates";
import type { TeamCard } from "@/lib/demo-social";
import { socialSnapshot, type SocialRola, type SocialSnapshot } from "@/lib/social";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type {
  AgeDivision,
  Belt,
  Competition,
  CompetitionMatch,
  DiscoverHit,
  MatchMethod,
  MatchResult,
  MatchStage,
  Modality,
  Organization,
  Placement,
  PrepPlan,
  TeamRole,
} from "@/lib/types";

function fail(error: { message: string } | null, message: string): void {
  if (!error) return;
  console.error(error.message);
  throw new Error(error.message || message);
}

type CompRow = {
  id: string;
  user_id: string;
  name: string;
  organization: Organization;
  event_date: string;
  city: string;
  modality: Modality;
  belt: Belt | null;
  age_division: AgeDivision;
  weight_class: string;
  absolute: boolean;
  absolute_placement: Placement | null;
  status: Competition["status"];
  placement: Placement | null;
  notes: string;
};

type MatchRow = {
  id: string;
  competition_id: string;
  sort_order: number;
  stage: MatchStage;
  opponent_name: string;
  result: MatchResult;
  method: MatchMethod;
  technique_id: string | null;
  points_for: number;
  points_against: number;
  advantages_for: number;
  advantages_against: number;
  penalties_for: number;
  penalties_against: number;
  duration_seconds: number;
  notes: string;
};

function mapCompetition(row: CompRow): Competition {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    organization: row.organization,
    date: row.event_date,
    city: row.city ?? "",
    modality: row.modality,
    belt: row.belt,
    ageDivision: row.age_division,
    weightClass: row.weight_class ?? "",
    absolute: row.absolute,
    absolutePlacement: row.absolute_placement,
    status: row.status,
    placement: row.placement,
    notes: row.notes ?? "",
  };
}

function mapMatch(row: MatchRow): CompetitionMatch {
  return {
    id: row.id,
    competitionId: row.competition_id,
    order: row.sort_order,
    stage: row.stage,
    opponentName: row.opponent_name,
    result: row.result,
    method: row.method,
    techniqueId: row.technique_id,
    pointsFor: row.points_for,
    pointsAgainst: row.points_against,
    advantagesFor: row.advantages_for,
    advantagesAgainst: row.advantages_against,
    penaltiesFor: row.penalties_for,
    penaltiesAgainst: row.penalties_against,
    durationSeconds: row.duration_seconds,
    notes: row.notes ?? "",
  };
}

export function socialRepository() {
  const supabase = createBrowserSupabase();

  async function userId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();
    fail(error, "Entre na sua conta para continuar.");
    if (!data.user) throw new Error("Entre na sua conta para continuar.");
    return data.user.id;
  }

  return {
    async teams(): Promise<TeamCard[]> {
      const uid = await userId();
      const { data: memberships, error } = await supabase
        .from("team_members")
        .select("team_id, role, status, teams(id, name, slug, owner_id, invite_code)")
        .eq("user_id", uid);
      fail(error, "Não foi possível abrir a equipe.");
      const { data: profile } = await supabase.from("profiles").select("primary_team_id").eq("id", uid).maybeSingle();
      const cards: TeamCard[] = [];
      for (const row of memberships ?? []) {
        const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
        if (!team) continue;
        const { data: board, error: boardError } = await supabase.rpc("team_board", { target: team.id });
        fail(boardError, "Equipe não encontrada.");
        let questTotal = 0;
        if (row.status === "active") {
          const total = await supabase.rpc("team_week_total", { target: team.id });
          fail(total.error, "Equipe não encontrada.");
          questTotal = Number(total.data ?? 0);
        }
        cards.push({
          id: team.id,
          name: team.name,
          slug: team.slug,
          inviteCode: row.status === "active" ? team.invite_code : "",
          ownerId: team.owner_id,
          primary: profile?.primary_team_id === team.id,
          role: row.role as TeamRole,
          questTotal,
          members: ((board ?? []) as Array<{
            user_id: string;
            display_name: string;
            belt: string | null;
            role: TeamRole;
            status: TeamCard["members"][number]["status"];
            weekly_trainings: number | null;
            public_level: number | null;
            public_title: string | null;
          }>).map((member) => ({
            userId: member.user_id,
            role: member.role,
            status: member.status,
            displayName: member.display_name,
            belt: member.belt,
            level: member.public_level,
            title: member.public_title,
            weeklyTrainings: member.weekly_trainings,
          })),
        });
      }
      return cards;
    },
    async search(query: string): Promise<DiscoverHit[]> {
      const { data, error } = await supabase.rpc("search_profiles", { q: query });
      fail(error, "Não foi possível buscar.");
      return ((data ?? []) as Array<{ id: string; username: string | null; display_name: string; belt: Belt | null; academia: string }>).map((row) => ({
        id: row.id,
        username: row.username ?? "",
        displayName: row.display_name,
        belt: row.belt,
        academy: row.academia ?? "",
      }));
    },
    async createTeam(name: string) {
      const { error } = await supabase.rpc("create_team", { team_name: name });
      fail(error, "Não foi possível criar a equipe.");
    },
    async renameTeam(id: string, name: string) {
      const { error } = await supabase.rpc("rename_team", { target: id, team_name: name });
      fail(error, "Não foi possível renomear.");
    },
    async invite(teamId: string, userId: string) {
      const { error } = await supabase.rpc("invite_to_team", { target_team: teamId, target_user: userId });
      fail(error, "Não foi possível convidar.");
    },
    async accept(teamId: string) {
      const { error } = await supabase.rpc("accept_team_invite", { target: teamId });
      fail(error, "Convite não encontrado.");
    },
    async join(code: string) {
      const { error } = await supabase.rpc("join_team_code", { code });
      fail(error, "Código inválido.");
    },
    async leave(teamId: string) {
      const { error } = await supabase.rpc("leave_team", { target: teamId });
      fail(error, error?.message === "Passe a equipe antes de sair" ? error.message : "Não foi possível sair.");
    },
    async remove(teamId: string, userId: string) {
      const { error } = await supabase.rpc("remove_team_member", { target: teamId, target_user: userId });
      fail(error, "Não foi possível remover.");
    },
    async setPrimary(teamId: string | null) {
      const { error } = await supabase.rpc("set_primary_team", { target: teamId });
      fail(error, "Equipe não encontrada.");
    },
    async snapshot(rolas: SocialRola[], trainingDates: string[]): Promise<SocialSnapshot> {
      const uid = await userId();
      const today = todayIso();
      const [competitions, matches, plans, cards] = await Promise.all([
        supabase.from("competitions").select("*").eq("user_id", uid),
        supabase.from("competition_matches").select("*"),
        supabase.from("prep_plans").select("*").eq("user_id", uid),
        this.teams(),
      ]);
      fail(competitions.error, "Não foi possível carregar as competições.");
      fail(matches.error, "Não foi possível carregar as lutas.");
      fail(plans.error, "Não foi possível carregar a campanha.");
      const comps = ((competitions.data ?? []) as CompRow[]).map(mapCompetition);
      const ids = new Set(comps.map((item) => item.id));
      return socialSnapshot({
        today,
        userId: uid,
        teams: cards.map((card) => ({
          id: card.id,
          name: card.name,
          ownerId: card.ownerId,
          createdAt: today,
          members: card.members.map((member) => ({ userId: member.userId, status: member.status })),
        })),
        questTotals: cards.map((card) => ({ teamId: card.id, name: card.name, total: card.questTotal })),
        competitions: comps,
        matches: ((matches.data ?? []) as MatchRow[]).map(mapMatch).filter((match) => ids.has(match.competitionId)),
        plans: ((plans.data ?? []) as Array<{
          id: string;
          competition_id: string;
          user_id: string;
          start_date: string;
          weekly_training_target: number;
          weekly_rola_target: number;
          focus_attributes: string[];
          target_weight_kg: number | null;
          current_weight_kg: number | null;
          active: boolean;
        }>).map((plan) => ({
          id: plan.id,
          competitionId: plan.competition_id,
          userId: plan.user_id,
          startDate: plan.start_date,
          weeklyTrainingTarget: plan.weekly_training_target,
          weeklyRolaTarget: plan.weekly_rola_target,
          focusAttributes: plan.focus_attributes ?? [],
          targetWeightKg: plan.target_weight_kg,
          currentWeightKg: plan.current_weight_kg,
          active: plan.active,
        })),
        rolas,
        trainingDates,
      });
    },
    async saveCompetition(input: Omit<Competition, "userId"> & { matches: Omit<CompetitionMatch, "id" | "competitionId">[] }) {
      const uid = await userId();
      const id = input.id || crypto.randomUUID();
      const { error } = await supabase.from("competitions").upsert({
        id,
        user_id: uid,
        name: input.name.trim(),
        organization: input.organization,
        event_date: input.date,
        city: input.city,
        modality: input.modality,
        belt: input.belt,
        age_division: input.ageDivision,
        weight_class: input.weightClass,
        absolute: input.absolute,
        absolute_placement: input.absolutePlacement,
        status: input.status,
        placement: input.placement,
        notes: input.notes,
      });
      fail(error, "Não foi possível salvar a competição.");
      await supabase.from("competition_matches").delete().eq("competition_id", id);
      if (input.matches.length) {
        const { error: matchError } = await supabase.from("competition_matches").insert(input.matches.map((match, index) => ({
          competition_id: id,
          sort_order: index + 1,
          stage: match.stage,
          opponent_name: match.opponentName,
          result: match.result,
          method: match.method,
          technique_id: match.techniqueId,
          points_for: match.pointsFor,
          points_against: match.pointsAgainst,
          advantages_for: match.advantagesFor,
          advantages_against: match.advantagesAgainst,
          penalties_for: match.penaltiesFor,
          penalties_against: match.penaltiesAgainst,
          duration_seconds: match.durationSeconds,
          notes: match.notes,
        })));
        fail(matchError, "Não foi possível salvar as lutas.");
      }
      return id;
    },
    async deleteCompetition(id: string) {
      const { error } = await supabase.from("competitions").delete().eq("id", id);
      fail(error, "Não foi possível apagar a competição.");
    },
    async savePlan(input: Omit<PrepPlan, "userId">) {
      const uid = await userId();
      if (input.active) {
        await supabase.from("prep_plans").update({ active: false }).eq("user_id", uid);
      }
      const { error } = await supabase.from("prep_plans").upsert({
        id: input.id || crypto.randomUUID(),
        competition_id: input.competitionId,
        user_id: uid,
        start_date: input.startDate,
        weekly_training_target: input.weeklyTrainingTarget,
        weekly_rola_target: input.weeklyRolaTarget,
        focus_attributes: input.focusAttributes.slice(0, 3),
        target_weight_kg: input.targetWeightKg,
        current_weight_kg: input.currentWeightKg,
        active: input.active,
      });
      fail(error, "Não foi possível salvar a campanha.");
    },
  };
}
