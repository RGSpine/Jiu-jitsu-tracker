import { addDays, inRange, parseIso, todayIso } from "@/lib/dates";
import type { Category, ModalityFilter, PeriodKey, PerspectiveRola } from "@/lib/types";

export type PeriodWindow = {
  key: PeriodKey;
  label: string;
  comparisonLabel: string;
  start: string;
  end: string;
  previousStart: string | null;
  previousEnd: string | null;
};

export type Bucket = {
  label: string;
  value: number;
};

export type TechniqueCount = {
  id: string;
  name: string;
  category: Category;
  count: number;
};

export type CategoryCount = {
  category: Category;
  count: number;
};

export type Summary = {
  rolas: number;
  wins: number;
  losses: number;
  draws: number;
  undecided: number;
  decided: number;
  winRate: number | null;
  submissionsApplied: number;
  submissionsSuffered: number;
  rolasFinished: number;
  submissionsPerRola: number | null;
  finishRate: number | null;
};

export type Trend = {
  label: string;
  current: number | null;
  previous: number | null;
  change: number | null;
  higherIsBetter: boolean;
  format: "integer" | "percent" | "decimal";
};

function monthBounds(iso: string): { start: string; end: string } {
  const date = parseIso(iso);
  const start = todayIso(new Date(date.getFullYear(), date.getMonth(), 1));
  const end = todayIso(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return { start, end };
}

function semesterBounds(iso: string): { start: string; end: string } {
  const date = parseIso(iso);
  const year = date.getFullYear();
  if (date.getMonth() < 6) {
    return { start: `${year}-01-01`, end: `${year}-06-30` };
  }
  return { start: `${year}-07-01`, end: `${year}-12-31` };
}

function startOfWeek(iso: string): string {
  const date = parseIso(iso);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(iso, diff);
}

export function periodWindow(key: PeriodKey, today: string): PeriodWindow {
  if (key === "semana") {
    const start = startOfWeek(today);
    const end = addDays(start, 6);
    return {
      key,
      label: "Esta semana",
      comparisonLabel: "semana anterior",
      start,
      end,
      previousStart: addDays(start, -7),
      previousEnd: addDays(start, -1),
    };
  }

  if (key === "mes") {
    const current = monthBounds(today);
    const previousAnchor = addDays(current.start, -1);
    const previous = monthBounds(previousAnchor);
    return {
      key,
      label: "Este mês",
      comparisonLabel: "mês anterior",
      start: current.start,
      end: current.end,
      previousStart: previous.start,
      previousEnd: previous.end,
    };
  }

  if (key === "semestre") {
    const current = semesterBounds(today);
    const previousAnchor = addDays(current.start, -1);
    const previous = semesterBounds(previousAnchor);
    const firstHalf = parseIso(today).getMonth() < 6;
    return {
      key,
      label: firstHalf ? "1º semestre" : "2º semestre",
      comparisonLabel: "semestre anterior",
      start: current.start,
      end: current.end,
      previousStart: previous.start,
      previousEnd: previous.end,
    };
  }

  if (key === "ano") {
    const year = parseIso(today).getFullYear();
    return {
      key,
      label: String(year),
      comparisonLabel: "ano anterior",
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      previousStart: `${year - 1}-01-01`,
      previousEnd: `${year - 1}-12-31`,
    };
  }

  return {
    key,
    label: "Tudo",
    comparisonLabel: "período anterior",
    start: "1970-01-01",
    end: "9999-12-31",
    previousStart: null,
    previousEnd: null,
  };
}

export function filterRolas(
  rolas: PerspectiveRola[],
  window: { start: string; end: string },
  modality: ModalityFilter,
): PerspectiveRola[] {
  return rolas.filter((rola) => {
    if (!inRange(rola.occurredOn, window.start, window.end)) return false;
    if (modality !== "todas" && rola.modality !== modality) return false;
    return true;
  });
}

export function summarize(rolas: PerspectiveRola[]): Summary {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let undecided = 0;
  let submissionsApplied = 0;
  let submissionsSuffered = 0;
  let rolasFinished = 0;

  for (const rola of rolas) {
    if (rola.result === "vitoria") wins += 1;
    else if (rola.result === "derrota") losses += 1;
    else if (rola.result === "empate") draws += 1;
    else undecided += 1;
    submissionsApplied += rola.submissionsApplied.length;
    submissionsSuffered += rola.submissionsSuffered.length;
    if (rola.submissionsApplied.length > 0) rolasFinished += 1;
  }

  const decided = wins + losses + draws;
  return {
    rolas: rolas.length,
    wins,
    losses,
    draws,
    undecided,
    decided,
    winRate: decided === 0 ? null : wins / decided,
    submissionsApplied,
    submissionsSuffered,
    rolasFinished,
    submissionsPerRola: rolas.length === 0 ? null : submissionsApplied / rolas.length,
    finishRate: rolas.length === 0 ? null : rolasFinished / rolas.length,
  };
}

export function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function trends(current: Summary, previous: Summary | null): Trend[] {
  const previousSummary = previous;
  return [
    {
      label: "Rolas",
      current: current.rolas,
      previous: previousSummary?.rolas ?? null,
      change: percentChange(current.rolas, previousSummary?.rolas ?? null),
      higherIsBetter: true,
      format: "integer",
    },
    {
      label: "Taxa de vitória",
      current: current.winRate,
      previous: previousSummary?.winRate ?? null,
      change: percentChange(current.winRate, previousSummary?.winRate ?? null),
      higherIsBetter: true,
      format: "percent",
    },
    {
      label: "Finalizações por rola",
      current: current.submissionsPerRola,
      previous: previousSummary?.submissionsPerRola ?? null,
      change: percentChange(current.submissionsPerRola, previousSummary?.submissionsPerRola ?? null),
      higherIsBetter: true,
      format: "decimal",
    },
    {
      label: "Rolas finalizadas",
      current: current.finishRate,
      previous: previousSummary?.finishRate ?? null,
      change: percentChange(current.finishRate, previousSummary?.finishRate ?? null),
      higherIsBetter: true,
      format: "percent",
    },
    {
      label: "Finalizações sofridas",
      current: current.submissionsSuffered,
      previous: previousSummary?.submissionsSuffered ?? null,
      change: percentChange(current.submissionsSuffered, previousSummary?.submissionsSuffered ?? null),
      higherIsBetter: false,
      format: "integer",
    },
  ];
}

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function countByDate(rolas: PerspectiveRola[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const rola of rolas) {
    map.set(rola.occurredOn, (map.get(rola.occurredOn) ?? 0) + 1);
  }
  return map;
}

export function volumeBuckets(key: PeriodKey, rolas: PerspectiveRola[], today: string): Bucket[] {
  const window = periodWindow(key, today);
  const scoped =
    key === "tudo"
      ? rolas.filter((rola) => rola.occurredOn <= today)
      : filterRolas(rolas, window, "todas");
  const counts = countByDate(scoped);

  if (key === "semana") {
    return WEEKDAY_LABELS.map((label, index) => {
      const iso = addDays(window.start, index);
      return { label, value: counts.get(iso) ?? 0 };
    });
  }

  if (key === "mes") {
    const start = parseIso(window.start);
    const endDay = parseIso(window.end).getDate();
    const buckets: Bucket[] = [];
    for (let day = 1; day <= endDay; day += 7) {
      const sliceEnd = Math.min(day + 6, endDay);
      let value = 0;
      for (let cursor = day; cursor <= sliceEnd; cursor += 1) {
        const iso = todayIso(new Date(start.getFullYear(), start.getMonth(), cursor));
        value += counts.get(iso) ?? 0;
      }
      buckets.push({ label: `${day}–${sliceEnd}`, value });
    }
    return buckets;
  }

  if (key === "semestre" || key === "ano") {
    const start = parseIso(window.start);
    const months = key === "ano" ? 12 : 6;
    return Array.from({ length: months }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const prefix = todayIso(date).slice(0, 7);
      let value = 0;
      for (const [iso, count] of counts) {
        if (iso.startsWith(prefix)) value += count;
      }
      return { label: MONTH_LABELS[date.getMonth()] ?? "", value };
    });
  }

  const months = new Map<string, number>();
  for (const [iso, count] of counts) {
    const keyMonth = iso.slice(0, 7);
    months.set(keyMonth, (months.get(keyMonth) ?? 0) + count);
  }
  const sorted = [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  return sorted.map(([keyMonth, value]) => {
    const monthIndex = Number(keyMonth.slice(5, 7)) - 1;
    const year = keyMonth.slice(2, 4);
    return { label: `${MONTH_LABELS[monthIndex]} ${year}`, value };
  });
}

export function categoryBreakdown(rolas: PerspectiveRola[]): CategoryCount[] {
  const totals = new Map<Category, number>();
  for (const rola of rolas) {
    const used = [...rola.techniquesUsed, ...rola.submissionsApplied];
    for (const technique of used) {
      totals.set(technique.category, (totals.get(technique.category) ?? 0) + 1);
    }
  }
  const order: Category[] = ["queda", "raspagem", "passagem", "finalizacao", "controle", "escape"];
  return order.map((category) => ({ category, count: totals.get(category) ?? 0 }));
}

export function techniqueRanking(rolas: PerspectiveRola[]): TechniqueCount[] {
  const totals = new Map<string, TechniqueCount>();
  for (const rola of rolas) {
    const used = [...rola.techniquesUsed, ...rola.submissionsApplied];
    for (const technique of used) {
      const current = totals.get(technique.id);
      if (current) current.count += 1;
      else totals.set(technique.id, { ...technique, count: 1 });
    }
  }
  return [...totals.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

export function chartTitle(key: PeriodKey): string {
  if (key === "semana") return "Rolas por dia";
  if (key === "mes") return "Rolas por semana";
  if (key === "semestre") return "Rolas por mês";
  if (key === "ano") return "Rolas por mês";
  return "Rolas por mês";
}
