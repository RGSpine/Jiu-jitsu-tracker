import { addDays, parseIso, todayIso } from "@/lib/dates";
import { filterRolas, periodWindow } from "@/lib/stats";
import type { ModalityFilter, PeriodKey, PerspectiveRola } from "@/lib/types";

/** Rolas no período anterior abaixo disso não geram percentual. */
export const MIN_BASELINE = 4;

export type DeltaStatus = "up" | "down" | "flat" | "new" | "low";

export type Delta = {
  current: number;
  previous: number;
  /** Variação percentual arredondada. Nula quando a base é pequena ou zero. */
  pct: number | null;
  status: DeltaStatus;
  /** Verdadeiro quando a mudança favorece o atleta. */
  good: boolean | null;
};

export type Snapshot = {
  rolas: number;
  trainings: number;
  matMinutes: number;
  avgRolaMinutes: number;
  submissionsApplied: number;
  submissionsSuffered: number;
  subsAppliedPerRola: number;
  subsSufferedPerRola: number;
  subsAppliedPerHour: number;
  subsSufferedPerHour: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsForPerRola: number;
  pointsAgainstPerRola: number;
  quedas: number;
  passagens: number;
  raspagens: number;
  finalizacoes: number;
  posicoes: number;
  escapes: number;
  quedasPerRola: number;
  passagensPerRola: number;
  raspagensPerRola: number;
  finalizacoesPerRola: number;
  posicoesPerRola: number;
  escapesPerRola: number;
};

export type MetricKey = keyof Snapshot;

export type MetricDef = {
  key: MetricKey;
  label: string;
  /** count = inteiro; rate = por rola ou por hora; percent = 0–1; minutes = tempo. */
  unit: "count" | "rate" | "percent" | "minutes";
  higherIsBetter: boolean;
};

export const METRICS: MetricDef[] = [
  { key: "trainings", label: "Treinos", unit: "count", higherIsBetter: true },
  { key: "rolas", label: "Rolas", unit: "count", higherIsBetter: true },
  { key: "matMinutes", label: "Tempo de tatame", unit: "minutes", higherIsBetter: true },
  { key: "avgRolaMinutes", label: "Duração média do rola", unit: "minutes", higherIsBetter: true },
  { key: "submissionsApplied", label: "Finalizações aplicadas", unit: "count", higherIsBetter: true },
  { key: "submissionsSuffered", label: "Finalizações sofridas", unit: "count", higherIsBetter: false },
  { key: "subsAppliedPerRola", label: "Finalizações por rola", unit: "rate", higherIsBetter: true },
  { key: "subsSufferedPerRola", label: "Finalizações sofridas por rola", unit: "rate", higherIsBetter: false },
  { key: "subsAppliedPerHour", label: "Finalizações por hora", unit: "rate", higherIsBetter: true },
  { key: "subsSufferedPerHour", label: "Finalizações sofridas por hora", unit: "rate", higherIsBetter: false },
  { key: "wins", label: "Vitórias", unit: "count", higherIsBetter: true },
  { key: "losses", label: "Derrotas", unit: "count", higherIsBetter: false },
  { key: "draws", label: "Empates", unit: "count", higherIsBetter: true },
  { key: "winRate", label: "Taxa de vitória", unit: "percent", higherIsBetter: true },
  { key: "pointsFor", label: "Pontos feitos", unit: "count", higherIsBetter: true },
  { key: "pointsAgainst", label: "Pontos levados", unit: "count", higherIsBetter: false },
  { key: "pointsForPerRola", label: "Pontos feitos por rola", unit: "rate", higherIsBetter: true },
  { key: "pointsAgainstPerRola", label: "Pontos levados por rola", unit: "rate", higherIsBetter: false },
  { key: "quedas", label: "Quedas", unit: "count", higherIsBetter: true },
  { key: "passagens", label: "Passagens", unit: "count", higherIsBetter: true },
  { key: "raspagens", label: "Raspagens", unit: "count", higherIsBetter: true },
  { key: "finalizacoes", label: "Finalizações", unit: "count", higherIsBetter: true },
  { key: "posicoes", label: "Costas e montada", unit: "count", higherIsBetter: true },
  { key: "escapes", label: "Saídas", unit: "count", higherIsBetter: true },
  { key: "quedasPerRola", label: "Quedas por rola", unit: "rate", higherIsBetter: true },
  { key: "passagensPerRola", label: "Passagens por rola", unit: "rate", higherIsBetter: true },
  { key: "raspagensPerRola", label: "Raspagens por rola", unit: "rate", higherIsBetter: true },
  { key: "finalizacoesPerRola", label: "Finalizações por rola no jogo", unit: "rate", higherIsBetter: true },
  { key: "posicoesPerRola", label: "Costas e montada por rola", unit: "rate", higherIsBetter: true },
  { key: "escapesPerRola", label: "Saídas por rola", unit: "rate", higherIsBetter: true },
];

const POSITION_IDS = new Set(["montada", "pegada-nas-costas"]);

function per(count: number, base: number): number {
  if (base <= 0) return 0;
  return count / base;
}

function countCategory(rolas: PerspectiveRola[], category: PerspectiveRola["techniquesUsed"][number]["category"]): number {
  return rolas.reduce((sum, rola) => sum + rola.techniquesUsed.filter((item) => item.category === category).length, 0);
}

export function snapshot(rolas: PerspectiveRola[]): Snapshot {
  const trainings = new Set(rolas.filter((rola) => rola.ownedByMe).map((rola) => rola.sessionId)).size;
  const matMinutes = rolas.reduce((sum, rola) => sum + rola.durationMinutes, 0);
  const submissionsApplied = rolas.reduce((sum, rola) => sum + rola.submissionsApplied.length, 0);
  const submissionsSuffered = rolas.reduce((sum, rola) => sum + rola.submissionsSuffered.length, 0);
  const wins = rolas.filter((rola) => rola.result === "vitoria").length;
  const losses = rolas.filter((rola) => rola.result === "derrota").length;
  const draws = rolas.filter((rola) => rola.result === "empate").length;
  const decided = wins + losses + draws;
  const pointsFor = rolas.reduce((sum, rola) => sum + rola.pointsFor, 0);
  const pointsAgainst = rolas.reduce((sum, rola) => sum + rola.pointsAgainst, 0);
  const quedas = countCategory(rolas, "queda");
  const passagens = countCategory(rolas, "passagem");
  const raspagens = countCategory(rolas, "raspagem");
  const escapes = countCategory(rolas, "escape");
  const posicoes = rolas.reduce(
    (sum, rola) => sum + rola.techniquesUsed.filter((item) => POSITION_IDS.has(item.id)).length,
    0,
  );
  const hours = matMinutes / 60;
  const n = rolas.length;
  return {
    rolas: n,
    trainings,
    matMinutes,
    avgRolaMinutes: per(matMinutes, n),
    submissionsApplied,
    submissionsSuffered,
    subsAppliedPerRola: per(submissionsApplied, n),
    subsSufferedPerRola: per(submissionsSuffered, n),
    subsAppliedPerHour: per(submissionsApplied, hours),
    subsSufferedPerHour: per(submissionsSuffered, hours),
    wins,
    losses,
    draws,
    winRate: per(wins, decided),
    pointsFor,
    pointsAgainst,
    pointsForPerRola: per(pointsFor, n),
    pointsAgainstPerRola: per(pointsAgainst, n),
    quedas,
    passagens,
    raspagens,
    finalizacoes: submissionsApplied,
    posicoes,
    escapes,
    quedasPerRola: per(quedas, n),
    passagensPerRola: per(passagens, n),
    raspagensPerRola: per(raspagens, n),
    finalizacoesPerRola: per(submissionsApplied, n),
    posicoesPerRola: per(posicoes, n),
    escapesPerRola: per(escapes, n),
  };
}

export function compareMetric(
  current: number,
  previous: number,
  higherIsBetter: boolean,
  previousRolas: number,
  unit: MetricDef["unit"] = "count",
): Delta {
  if (previous === 0 && current === 0) {
    return { current, previous, pct: null, status: "flat", good: null };
  }
  if (previous === 0 && current > 0) {
    return { current, previous, pct: null, status: "new", good: higherIsBetter ? true : false };
  }
  const thinCount = (unit === "count" || unit === "minutes") && previous < MIN_BASELINE;
  if (previousRolas < MIN_BASELINE || thinCount) {
    return { current, previous, pct: null, status: "low", good: null };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (Math.abs(pct) < 5) return { current, previous, pct: 0, status: "flat", good: null };
  const status: DeltaStatus = pct > 0 ? "up" : "down";
  const good = higherIsBetter ? pct > 0 : pct < 0;
  return { current, previous, pct, status, good };
}

export type ComparedMetric = MetricDef & { delta: Delta };

export function compareSnapshots(current: Snapshot, previous: Snapshot): ComparedMetric[] {
  return METRICS.map((metric) => ({
    ...metric,
    delta: compareMetric(current[metric.key], previous[metric.key], metric.higherIsBetter, previous.rolas, metric.unit),
  }));
}

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type EvolutionPoint = {
  label: string;
  trainings: number;
  rolas: number;
  matMinutes: number;
  avgRolaMinutes: number;
  submissionsApplied: number;
  submissionsSuffered: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  quedas: number;
  passagens: number;
  raspagens: number;
  finalizacoes: number;
  posicoes: number;
  escapes: number;
};

function evolutionPoint(label: string, rolas: PerspectiveRola[]): EvolutionPoint {
  const view = snapshot(rolas);
  return {
    label,
    trainings: view.trainings,
    rolas: view.rolas,
    matMinutes: view.matMinutes,
    avgRolaMinutes: Math.round(view.avgRolaMinutes),
    submissionsApplied: view.submissionsApplied,
    submissionsSuffered: view.submissionsSuffered,
    wins: view.wins,
    losses: view.losses,
    draws: view.draws,
    pointsFor: view.pointsFor,
    pointsAgainst: view.pointsAgainst,
    quedas: view.quedas,
    passagens: view.passagens,
    raspagens: view.raspagens,
    finalizacoes: view.finalizacoes,
    posicoes: view.posicoes,
    escapes: view.escapes,
  };
}

export function evolutionPoints(period: PeriodKey, rolas: PerspectiveRola[], today: string): EvolutionPoint[] {
  const window = periodWindow(period, today);
  const scoped = period === "tudo" ? rolas.filter((rola) => rola.occurredOn <= today) : rolas;

  if (period === "semana") {
    return WEEKDAY_LABELS.flatMap((label, index) => {
      const iso = addDays(window.start, index);
      if (iso > today) return [];
      return [evolutionPoint(label, scoped.filter((rola) => rola.occurredOn === iso))];
    });
  }

  if (period === "mes") {
    const start = parseIso(window.start);
    const endDay = parseIso(window.end).getDate();
    const buckets: EvolutionPoint[] = [];
    for (let day = 1; day <= endDay; day += 7) {
      const sliceEnd = Math.min(day + 6, endDay);
      const from = todayIso(new Date(start.getFullYear(), start.getMonth(), day));
      if (from > today) continue;
      const to = todayIso(new Date(start.getFullYear(), start.getMonth(), sliceEnd));
      buckets.push(evolutionPoint(`${day}`, scoped.filter((rola) => rola.occurredOn >= from && rola.occurredOn <= to)));
    }
    return buckets;
  }

  if (period === "semestre" || period === "ano") {
    const start = parseIso(window.start);
    const months = period === "ano" ? 12 : 6;
    const currentMonth = today.slice(0, 7);
    return Array.from({ length: months }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const prefix = todayIso(date).slice(0, 7);
      if (prefix > currentMonth) return null;
      return evolutionPoint(MONTH_LABELS[date.getMonth()] ?? "", scoped.filter((rola) => rola.occurredOn.startsWith(prefix)));
    }).filter((point): point is EvolutionPoint => point !== null);
  }

  const months = new Map<string, PerspectiveRola[]>();
  for (const rola of scoped) {
    const key = rola.occurredOn.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), rola]);
  }
  return [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([key, list]) => {
    const monthIndex = Number(key.slice(5, 7)) - 1;
    return evolutionPoint(`${MONTH_LABELS[monthIndex] ?? ""} ${key.slice(2, 4)}`, list);
  });
}

export function reportFor(
  rolas: PerspectiveRola[],
  period: PeriodKey,
  today: string,
  modality: ModalityFilter = "todas",
): { current: Snapshot; previous: Snapshot; metrics: ComparedMetric[]; evolution: EvolutionPoint[] } {
  const window = periodWindow(period, today);
  const currentRolas = filterRolas(rolas, window, modality);
  const previousRolas = window.previousStart && window.previousEnd
    ? filterRolas(rolas, { start: window.previousStart, end: window.previousEnd }, modality)
    : [];
  const current = snapshot(currentRolas);
  const previous = snapshot(previousRolas);
  return {
    current,
    previous,
    metrics: compareSnapshots(current, previous),
    evolution: evolutionPoints(period, currentRolas, today),
  };
}

export function weeklyTrainingAverage(rolas: PerspectiveRola[], today: string): number {
  const start = periodWindow("semana", today).start;
  const weeks: number[] = [];
  for (let index = 1; index <= 8; index += 1) {
    const weekStart = addDaysSafe(start, -7 * index);
    const weekEnd = addDaysSafe(weekStart, 6);
    weeks.push(snapshot(filterRolas(rolas, { start: weekStart, end: weekEnd }, "todas")).trainings);
  }
  return weeks.reduce((sum, value) => sum + value, 0) / weeks.length;
}

function addDaysSafe(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
