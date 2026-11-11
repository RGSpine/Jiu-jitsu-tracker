import type { ComparedMetric, Snapshot } from "@/lib/metrics";
import type { PeriodKey } from "@/lib/types";

export type Insight = {
  id: string;
  text: string;
  tone: "up" | "down" | "neutral";
  score: number;
  numbers: number[];
};

const PERIOD_NAME: Record<PeriodKey, string> = {
  semana: "nesta semana",
  mes: "no último mês",
  semestre: "neste semestre",
  ano: "neste ano",
  tudo: "no histórico",
};

const PREVIOUS_NAME: Record<PeriodKey, string> = {
  semana: "na semana anterior",
  mes: "no mês anterior",
  semestre: "no semestre anterior",
  ano: "no ano anterior",
  tudo: "antes",
};

function signed(pct: number): string {
  const abs = Math.abs(pct);
  return `${abs}%`;
}

function fromMetric(metric: ComparedMetric, period: PeriodKey, sentence: (pct: number) => string): Insight | null {
  if (metric.delta.pct === null || metric.delta.status === "flat" || metric.delta.status === "low") return null;
  if (metric.delta.status === "new") return null;
  const pct = metric.delta.pct;
  const tone = metric.delta.good ? "up" : "down";
  return {
    id: metric.key,
    text: sentence(pct),
    tone,
    score: Math.abs(pct) + (tone === "down" ? 4 : 0),
    numbers: [Math.abs(pct), Math.round(metric.delta.current), Math.round(metric.delta.previous)],
  };
}

export function buildInsights(
  metrics: ComparedMetric[],
  period: PeriodKey,
  current: Snapshot,
  weeklyAverage: number,
): Insight[] {
  const byKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const when = PERIOD_NAME[period];
  const before = PREVIOUS_NAME[period];
  const drafts: Array<Insight | null> = [];

  const suffered = byKey.get("subsSufferedPerRola");
  if (suffered) {
    drafts.push(fromMetric(suffered, period, (pct) => (
      pct < 0
        ? `${cap(when)} você foi finalizado ${signed(pct)} menos que ${before}.`
        : `${cap(when)} você foi finalizado ${signed(pct)} mais que ${before}.`
    )));
  }

  const finishes = byKey.get("finalizacoesPerRola");
  if (finishes) {
    drafts.push(fromMetric(finishes, period, (pct) => (
      pct > 0
        ? `Suas finalizações aumentaram ${signed(pct)}.`
        : `Suas finalizações caíram ${signed(pct)}.`
    )));
  }

  const passes = byKey.get("passagensPerRola");
  if (passes) {
    drafts.push(fromMetric(passes, period, (pct) => (
      pct > 0
        ? `Seu jogo de passagem melhorou ${signed(pct)}.`
        : `Suas passagens caíram ${signed(pct)}.`
    )));
  }

  const sweeps = byKey.get("raspagensPerRola");
  if (sweeps) {
    drafts.push(fromMetric(sweeps, period, (pct) => (
      pct > 0
        ? `Suas raspagens subiram ${signed(pct)}.`
        : `Suas raspagens caíram ${signed(pct)}.`
    )));
  }

  const takedowns = byKey.get("quedasPerRola");
  if (takedowns) {
    drafts.push(fromMetric(takedowns, period, (pct) => (
      pct > 0
        ? `Suas quedas aumentaram ${signed(pct)}.`
        : `Suas quedas caíram ${signed(pct)}.`
    )));
  }

  const positions = byKey.get("posicoesPerRola");
  if (positions) {
    drafts.push(fromMetric(positions, period, (pct) => (
      pct > 0
        ? `Costas e montada apareceram ${signed(pct)} mais.`
        : `Costas e montada caíram ${signed(pct)}.`
    )));
  }

  const win = byKey.get("winRate");
  if (win) {
    drafts.push(fromMetric(win, period, (pct) => (
      pct > 0
        ? `Sua taxa de vitória subiu ${signed(pct)}.`
        : `Sua taxa de vitória caiu ${signed(pct)}.`
    )));
  }

  if (period === "semana" && current.trainings > 0) {
    const average = Math.round(weeklyAverage);
    const diff = current.trainings - average;
    if (diff !== 0) {
      drafts.push({
        id: "weekly-average",
        text: diff > 0
          ? `Você treinou ${current.trainings}x esta semana, ${diff} a mais que a média.`
          : `Você treinou ${current.trainings}x esta semana, ${Math.abs(diff)} a menos que a média.`,
        tone: diff > 0 ? "up" : "down",
        score: 18 + Math.abs(diff),
        numbers: [current.trainings, Math.abs(diff), average],
      });
    }
  }

  return drafts
    .filter((item): item is Insight => item !== null)
    .sort((a, b) => b.score - a.score);
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function factsHold(text: string, allowed: number[]): boolean {
  const found = text.match(/\d+/g)?.map((item) => Number(item)) ?? [];
  return found.every((number) => allowed.includes(number));
}

export function acceptRephrases(templates: Insight[], lines: string[]): Insight[] {
  return templates.map((insight, index) => {
    const line = lines[index]?.trim();
    if (!line || !factsHold(line, insight.numbers)) return insight;
    return { ...insight, text: line };
  });
}
