import { ibjjfMatchMinutes } from "@/data/rules";
import { addDays, daysBetween, inRange, startOfWeek } from "@/lib/dates";
import { MIN_BASELINE, compareMetric, type Delta } from "@/lib/metrics";
import type { SystemLogEntry } from "@/lib/progression";
import type {
  AgeDivision,
  Belt,
  Competition,
  CompetitionMatch,
  MatchMethod,
  MatchStage,
  Placement,
  PrepPlan,
} from "@/lib/types";

export const COMPETITION_XP = {
  full: 100,
  historical: 40,
  perWin: 20,
  maxWins: 6,
  medal: { ouro: 80, prata: 50, bronze: 30, participacao: 0 } as Record<Placement, number>,
} as const;

export const PHASE_QUEST_XP = 20;
export const READINESS_WEIGHTS = {
  adherence: 30,
  fight: 20,
  simulation: 15,
  standing: 10,
  focus: 15,
  weight: 10,
} as const;

export type CampaignPhase = "base" | "especifico" | "polimento" | "semana" | "encerrada";

export function campaignPhase(daysUntil: number): CampaignPhase {
  if (daysUntil < 0) return "encerrada";
  if (daysUntil <= 7) return "semana";
  if (daysUntil <= 20) return "polimento";
  if (daysUntil <= 56) return "especifico";
  return "base";
}

export function phaseLabel(phase: CampaignPhase): string {
  if (phase === "base") return "Base";
  if (phase === "especifico") return "Específico";
  if (phase === "polimento") return "Polimento";
  if (phase === "semana") return "Semana da luta";
  return "Encerrada";
}

export type CompetitionXpRow = {
  id: string;
  date: string;
  status: Competition["status"];
  placement: Placement | null;
  wins: number;
  matches: number;
};

/** XP de competição. Fora do teto diário. No máximo uma competição pontua por data. */
export function competitionBonusXp(rows: CompetitionXpRow[]): { total: number; awarded: string[] } {
  const done = rows.filter((row) => row.status === "done");
  const byDate = new Map<string, CompetitionXpRow>();
  for (const row of done) {
    const current = byDate.get(row.date);
    if (!current || rowXp(row) > rowXp(current)) byDate.set(row.date, row);
  }
  const awarded = [...byDate.values()];
  return { total: awarded.reduce((sum, row) => sum + rowXp(row), 0), awarded: awarded.map((row) => row.id) };
}

export function rowXp(row: CompetitionXpRow): number {
  if (row.matches <= 0) return COMPETITION_XP.historical;
  const wins = Math.min(COMPETITION_XP.maxWins, Math.max(0, row.wins));
  const medal = row.placement ? COMPETITION_XP.medal[row.placement] : 0;
  return COMPETITION_XP.full + wins * COMPETITION_XP.perWin + medal;
}

export type HonorInput = {
  competitions: Competition[];
  matches: CompetitionMatch[];
  founded: boolean;
  foundedOn?: string;
};

export function competitionHonors(input: HonorInput): { id: string; title: string; occurredOn: string }[] {
  const done = input.competitions
    .filter((item) => item.status === "done")
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const medals = done.filter((item) => item.placement === "ouro" || item.placement === "prata" || item.placement === "bronze");
  const golds = done.filter((item) => item.placement === "ouro");
  const doubled = done.find((item) => item.placement === "ouro" && item.absolutePlacement === "ouro");
  const honors: { id: string; title: string; occurredOn: string }[] = [];
  if (input.founded) honors.push({ id: "titulo:fundador", title: "Fundador", occurredOn: input.foundedOn ?? done[0]?.date ?? input.competitions[0]?.date ?? "1970-01-01" });
  if (done[0]) honors.push({ id: "titulo:estreante", title: "Estreante", occurredOn: done[0].date });
  if (medals.length >= 3) honors.push({ id: "titulo:medalhista", title: "Medalhista", occurredOn: medals[2]!.date });
  if (golds[0]) honors.push({ id: "titulo:campeao", title: "Campeão", occurredOn: golds[0].date });
  if (doubled) honors.push({ id: "titulo:duplo-ouro", title: "Duplo ouro", occurredOn: doubled.date });
  if (done.length >= 10) honors.push({ id: "titulo:veterano", title: "Veterano de chave", occurredOn: done[9]!.date });
  void input.matches;
  return honors;
}

export function honorLog(honors: { id: string; title: string; occurredOn: string }[]): SystemLogEntry[] {
  return honors.map((honor) => ({
    id: honor.id,
    kind: honor.id.startsWith("titulo:fundador") ? "equipe" : "competicao",
    body: `[SISTEMA] Novo título adquirido: ${honor.title}`,
    occurredOn: honor.occurredOn,
  }));
}

export type StageStat = { stage: MatchStage; wins: number; losses: number; draws: number; rate: number | null };
export type MethodStat = { method: MatchMethod; count: number };

export type CompetitionReport = {
  medals: Record<Placement, number>;
  winRate: number | null;
  submissionWinRate: number | null;
  byCompetition: { id: string; name: string; date: string; wins: number; matches: number; rate: number | null }[];
  winMethods: MethodStat[];
  lossMethods: MethodStat[];
  byStage: StageStat[];
  pointsFor: number;
  pointsAgainst: number;
  pointsSample: boolean;
  versusTraining: Delta;
};

export function competitionReport(
  competitions: Competition[],
  matches: CompetitionMatch[],
  training: { rolas: number; submissionRate: number },
): CompetitionReport {
  const decided = matches.filter((match) => match.result !== "empate");
  const wins = matches.filter((match) => match.result === "vitoria");
  const medals: Record<Placement, number> = { ouro: 0, prata: 0, bronze: 0, participacao: 0 };
  for (const item of competitions) {
    if (item.status === "done" && item.placement) medals[item.placement] += 1;
  }
  const byCompetition = competitions
    .filter((item) => item.status === "done")
    .map((item) => {
      const own = matches.filter((match) => match.competitionId === item.id);
      const ownWins = own.filter((match) => match.result === "vitoria").length;
      return {
        id: item.id,
        name: item.name,
        date: item.date,
        wins: ownWins,
        matches: own.length,
        rate: own.length >= MIN_BASELINE ? ownWins / own.length : null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const stages: MatchStage[] = ["oitavas", "quartas", "semi", "final", "absoluto", "outro"];
  const byStage = stages.map((stage) => {
    const own = matches.filter((match) => match.stage === stage);
    const stageWins = own.filter((match) => match.result === "vitoria").length;
    const stageLosses = own.filter((match) => match.result === "derrota").length;
    const stageDraws = own.filter((match) => match.result === "empate").length;
    return {
      stage,
      wins: stageWins,
      losses: stageLosses,
      draws: stageDraws,
      rate: own.length >= MIN_BASELINE ? stageWins / own.length : null,
    };
  }).filter((item) => item.wins + item.losses + item.draws > 0);
  const subWins = wins.filter((match) => match.method === "finalizacao").length;
  const compRate = matches.length > 0 ? subWins / matches.length : 0;
  const sample = Math.min(training.rolas, matches.length);
  return {
    medals,
    winRate: decided.length >= MIN_BASELINE ? wins.length / decided.length : null,
    submissionWinRate: wins.length >= MIN_BASELINE ? subWins / wins.length : null,
    byCompetition,
    winMethods: methodCounts(wins),
    lossMethods: methodCounts(matches.filter((match) => match.result === "derrota")),
    byStage,
    pointsFor: matches.reduce((sum, match) => sum + match.pointsFor, 0),
    pointsAgainst: matches.reduce((sum, match) => sum + match.pointsAgainst, 0),
    pointsSample: matches.length >= MIN_BASELINE,
    versusTraining: compareMetric(compRate, training.submissionRate, true, sample, "rate"),
  };
}

function methodCounts(matches: CompetitionMatch[]): MethodStat[] {
  const methods: MatchMethod[] = ["finalizacao", "pontos", "vantagens", "punicao", "decisao", "dq", "wo"];
  return methods
    .map((method) => ({ method, count: matches.filter((match) => match.method === method).length }))
    .filter((item) => item.count > 0);
}

export function weightScore(currentKg: number, targetKg: number): number {
  const over = currentKg - targetKg;
  if (over <= 0.5) return 1;
  if (over >= 3) return 0;
  return 1 - (over - 0.5) / 2.5;
}

export type ReadinessPart = { key: keyof typeof READINESS_WEIGHTS; score: number; weight: number };

export function readinessIndex(parts: ReadinessPart[]): number {
  const used = parts.filter((part) => part.weight > 0);
  const total = used.reduce((sum, part) => sum + part.weight, 0);
  if (total <= 0) return 0;
  const raw = used.reduce((sum, part) => sum + part.weight * clamp01(part.score), 0) / total;
  return Math.round(raw * 100);
}

export type CampaignRola = {
  occurredOn: string;
  sessionId: string;
  durationMinutes: number;
  simulation: boolean;
  startedStanding: boolean;
  scored: boolean;
  queda: boolean;
};

export type CampaignAssessment = {
  phase: CampaignPhase;
  days: number;
  adherence: number;
  readiness: number;
  parts: ReadinessPart[];
  fightRolas: number;
  simulations: number;
  standingRate: number;
  quest: { id: string; text: string; done: boolean; reward: number };
};

export function assessCampaign(input: {
  today: string;
  startDate: string;
  eventDate: string;
  weeklyTrainingTarget: number;
  weeklyRolaTarget: number;
  trainingDates: string[];
  rolas: CampaignRola[];
  matchMinutes: number;
  focusScore: number;
  targetWeightKg: number | null;
  currentWeightKg: number | null;
}): CampaignAssessment {
  const days = daysBetween(input.today, input.eventDate);
  const phase = campaignPhase(days);
  const end = input.today < input.eventDate ? input.today : input.eventDate;
  const started = input.today >= input.startDate;
  const span = started ? daysBetween(input.startDate, end) + 1 : 0;
  const weeks = started ? Math.max(1, Math.ceil(span / 7)) : 0;
  const trainings = new Set(input.trainingDates.filter((date) => started && inRange(date, input.startDate, end))).size;
  const targetTrainings = Math.max(1, input.weeklyTrainingTarget * Math.max(weeks, 1));
  const adherence = started ? Math.min(1, trainings / targetTrainings) : 1;
  const windowRolas = input.rolas.filter((rola) => started && inRange(rola.occurredOn, input.startDate, end));
  const fightRolas = windowRolas.filter((rola) => rola.durationMinutes >= input.matchMinutes).length;
  const fightTarget = Math.max(MIN_BASELINE, Math.round(input.weeklyRolaTarget * Math.max(weeks, 1) * 0.5));
  const fightScore = Math.min(1, fightRolas / fightTarget);
  const simulations = windowRolas.filter((rola) => rola.simulation && rola.scored).length;
  const standingRate = windowRolas.length === 0
    ? 0
    : windowRolas.filter((rola) => rola.startedStanding || rola.queda).length / windowRolas.length;
  const parts: ReadinessPart[] = [
    { key: "adherence", score: adherence, weight: READINESS_WEIGHTS.adherence },
    { key: "fight", score: fightScore, weight: READINESS_WEIGHTS.fight },
    { key: "simulation", score: Math.min(1, simulations / 4), weight: READINESS_WEIGHTS.simulation },
    { key: "standing", score: standingRate, weight: READINESS_WEIGHTS.standing },
    { key: "focus", score: input.focusScore, weight: READINESS_WEIGHTS.focus },
  ];
  if (input.targetWeightKg !== null && input.currentWeightKg !== null) {
    parts.push({ key: "weight", score: weightScore(input.currentWeightKg, input.targetWeightKg), weight: READINESS_WEIGHTS.weight });
  }
  const weekStart = startOfWeek(input.today);
  const weekEnd = addDays(weekStart, 6);
  const weekTrainings = new Set(input.trainingDates.filter((date) => inRange(date, weekStart, weekEnd))).size;
  const weekFight = input.rolas.filter((rola) => inRange(rola.occurredOn, weekStart, weekEnd) && rola.durationMinutes >= input.matchMinutes).length;
  const recentSims = input.rolas.filter((rola) => rola.simulation && rola.scored && inRange(rola.occurredOn, addDays(input.today, -13), input.today)).length;
  const quest = phaseQuest(phase, {
    weekTrainings,
    weeklyTrainingTarget: input.weeklyTrainingTarget,
    weekFight,
    weeklyRolaTarget: input.weeklyRolaTarget,
    recentSims,
  });
  return {
    phase,
    days,
    adherence,
    readiness: readinessIndex(parts),
    parts,
    fightRolas,
    simulations,
    standingRate,
    quest,
  };
}

export function phaseQuest(
  phase: CampaignPhase,
  stats: { weekTrainings: number; weeklyTrainingTarget: number; weekFight: number; weeklyRolaTarget: number; recentSims: number },
): { id: string; text: string; done: boolean; reward: number } {
  if (phase === "especifico") {
    const goal = Math.min(MIN_BASELINE, Math.max(1, stats.weeklyRolaTarget));
    return { id: "fase:especifico", text: `Específico: ${goal} rolas no tempo de luta nesta semana.`, done: stats.weekFight >= goal, reward: PHASE_QUEST_XP };
  }
  if (phase === "polimento") {
    return { id: "fase:polimento", text: "Polimento: 2 simulações com placar.", done: stats.recentSims >= 2, reward: PHASE_QUEST_XP };
  }
  if (phase === "semana") {
    return { id: "fase:semana", text: "Semana da luta: um treino, volume baixo.", done: stats.weekTrainings >= 1, reward: PHASE_QUEST_XP };
  }
  if (phase === "encerrada") {
    return { id: "fase:encerrada", text: "Campanha encerrada.", done: false, reward: 0 };
  }
  const goal = Math.max(1, stats.weeklyTrainingTarget);
  return { id: "fase:base", text: `Base: ${goal} treinos nesta semana.`, done: stats.weekTrainings >= goal, reward: PHASE_QUEST_XP };
}

export function campaignMessages(input: {
  planId: string;
  name: string;
  startDate: string;
  eventDate: string;
  today: string;
  adherence: number;
  active: boolean;
}): SystemLogEntry[] {
  const days = daysBetween(input.today, input.eventDate);
  const phase = campaignPhase(days);
  const entries: SystemLogEntry[] = [];
  if (input.active && days >= 0) {
    entries.push({
      id: `campanha-inicio:${input.planId}`,
      kind: "campanha",
      occurredOn: input.startDate <= input.today ? input.startDate : input.today,
      body: `[SISTEMA] Campanha iniciada: ${input.name} em ${days} dias.`,
    });
  }
  if (phase === "polimento" || phase === "semana" || phase === "encerrada") {
    const when = addDays(input.eventDate, -20);
    entries.push({
      id: `campanha-fase:polimento:${input.planId}`,
      kind: "campanha",
      occurredOn: when <= input.today ? when : input.today,
      body: "[SISTEMA] Fase Polimento.",
    });
  }
  if (days === 0) {
    entries.push({
      id: `campanha-dia:${input.planId}`,
      kind: "campanha",
      occurredOn: input.eventDate,
      body: "[SISTEMA] Dia da luta.",
    });
  }
  if (days < 0 && input.adherence >= 0.8) {
    entries.push({
      id: `titulo:campanha-completa:${input.planId}`,
      kind: "competicao",
      occurredOn: input.eventDate,
      body: "[SISTEMA] Novo título adquirido: Campanha completa",
    });
  }
  return entries;
}

export function matchMinutesFor(belt: Belt | null, age: AgeDivision): number {
  return ibjjfMatchMinutes(belt, age);
}

export function focusScore(before: number[], after: number[]): number {
  if (before.length === 0) return 0;
  const scores = before.map((level, index) => Math.min(1, Math.max(0, ((after[index] ?? level) - level) / 2)));
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function nextCompetition(competitions: Competition[], today: string): Competition | null {
  return competitions
    .filter((item) => item.status === "planned" && item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

export function activePlan(plans: PrepPlan[], competitions: Competition[], today: string): { plan: PrepPlan; competition: Competition } | null {
  const plan = plans.find((item) => item.active);
  if (!plan) return null;
  const competition = competitions.find((item) => item.id === plan.competitionId && item.status === "planned" && item.date >= today);
  if (!competition) return null;
  return { plan, competition };
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
