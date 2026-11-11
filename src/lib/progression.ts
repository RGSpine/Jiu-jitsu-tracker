import { techniques } from "@/data/catalog";
import { addDays, parseIso, todayIso } from "@/lib/dates";
import { MIN_BASELINE, compareMetric } from "@/lib/metrics";
import type { Category, Modality } from "@/lib/types";

/** Números fáceis de afinar. O teto diário impede farmar XP com rola inventado. */
export const PROGRESSION = {
  showUp: 25,
  perMinute: 1,
  minutePerRola: 10,
  minuteCap: 80,
  perRola: 4,
  rolaCap: 8,
  perSub: 6,
  subCap: 3,
  perPoint: 1,
  pointCap: 12,
  ritmoStep: 6,
  ritmoGapDays: 3,
  ritmoCap: 4,
  dailyCap: 150,
  questWeekCap: 60,
  attributeCap: 20,
} as const;

export type AttributeId =
  | "quedas"
  | "passagem"
  | "guarda"
  | "costas"
  | "pes"
  | "pescoco"
  | "bracos"
  | "defesa"
  | "presenca";

export const ATTRIBUTES: { id: AttributeId; label: string; hint: string }[] = [
  { id: "quedas", label: "Quedas", hint: "Levar ao chão" },
  { id: "passagem", label: "Passagem", hint: "Passar a guarda" },
  { id: "guarda", label: "Guarda", hint: "Raspagem e guarda" },
  { id: "costas", label: "Costas", hint: "Pegar as costas" },
  { id: "pes", label: "Pés", hint: "Chaves de perna" },
  { id: "pescoco", label: "Pescoço", hint: "Estrangulamentos" },
  { id: "bracos", label: "Braços", hint: "Chaves de braço" },
  { id: "defesa", label: "Defesa", hint: "Saídas" },
  { id: "presenca", label: "Presença", hint: "Voltar ao tatame" },
];

const PES = new Set(["heel-hook", "kneebar", "chave-de-tornozelo", "toe-hold", "leg-lock", "ashi-garami", "saddle", "cross-ashi"]);
const PESCOCO = new Set(["triangulo", "triangulo-invertido", "guilhotina", "ezekiel", "relogio", "arco-e-flecha", "estrangulamento-lapela", "katagatame", "anaconda", "darce", "estrangulamento-canto", "loop-choke", "norte-sul"]);
const BRACOS = new Set(["armlock", "kimura", "americana", "omoplata"]);
const COSTAS = new Set(["pegada-nas-costas", "mata-leao"]);
const GUARDA = new Set(["guarda-fechada", "meia-guarda", "de-la-riva", "guarda-sentada", "guarda-x", "guarda-aranha"]);

const TECHNIQUE = new Map(techniques.map((item) => [item.id, item]));

export type ProgressRola = {
  occurredOn: string;
  modality: Modality;
  durationMinutes: number;
  sessionId: string;
  pointsFor: number;
  submissionsApplied: { id: string }[];
  submissionsSuffered: { id: string }[];
  techniquesUsed: { id: string; category?: Category }[];
};

export type SkillRule =
  | { type: "count"; ids?: string[]; attribute?: AttributeId; submissions?: boolean; atLeast: number }
  | { type: "rate"; attribute: AttributeId; percent: number; minEvents: number }
  | { type: "weeks"; weeks: number; minSessions: number }
  | { type: "defense"; escapes: number; percent: number };

export type SkillDef = {
  id: string;
  name: string;
  title: string;
  attribute: AttributeId;
  hint: string;
  rule: SkillRule;
};

export const SKILLS: SkillDef[] = [
  { id: "no-tatame", name: "Presente", title: "Presente", attribute: "presenca", hint: "Registrar um treino", rule: { type: "count", attribute: "presenca", atLeast: 1 } },
  { id: "primeira-queda", name: "Queda", title: "Queda limpa", attribute: "quedas", hint: "Completar uma queda", rule: { type: "count", attribute: "quedas", atLeast: 1 } },
  { id: "primeiro-triangulo", name: "Triângulo", title: "Triângulo", attribute: "pescoco", hint: "Finalizar de triângulo", rule: { type: "count", ids: ["triangulo"], atLeast: 1 } },
  { id: "costas", name: "Costas", title: "Das costas", attribute: "costas", hint: "Pegar as costas 5 vezes", rule: { type: "count", ids: ["pegada-nas-costas"], atLeast: 5 } },
  { id: "chave-de-braco", name: "Braço", title: "Chave de braço", attribute: "bracos", hint: "Finalizar 3 chaves de braço", rule: { type: "count", ids: [...BRACOS], submissions: true, atLeast: 3 } },
  { id: "estrangulador", name: "Pescoço", title: "Estrangulador", attribute: "pescoco", hint: "Finalizar 5 estrangulamentos", rule: { type: "count", ids: [...PESCOCO], submissions: true, atLeast: 5 } },
  { id: "dez-finais", name: "Dez finais", title: "Dez finais", attribute: "presenca", hint: "Aplicar 10 finalizações", rule: { type: "count", submissions: true, atLeast: 10 } },
  { id: "finalizador-pe", name: "Pés", title: "Finalizador de pé", attribute: "pes", hint: "Chave de perna +10% no mês", rule: { type: "rate", attribute: "pes", percent: 10, minEvents: 2 } },
  { id: "passador", name: "Passagem", title: "Passador", attribute: "passagem", hint: "Passagem +15% no mês", rule: { type: "rate", attribute: "passagem", percent: 15, minEvents: 4 } },
  { id: "guarda-viva", name: "Guarda", title: "Guarda viva", attribute: "guarda", hint: "Guarda +15% no mês", rule: { type: "rate", attribute: "guarda", percent: 15, minEvents: 4 } },
  { id: "defesa-firme", name: "Defesa", title: "Difícil de pegar", attribute: "defesa", hint: "Sofrer menos finais", rule: { type: "defense", escapes: 8, percent: 10 } },
  { id: "rotina", name: "Rotina", title: "Rotina", attribute: "presenca", hint: "Treinar 2 vezes por semana, 4 semanas seguidas", rule: { type: "weeks", weeks: 4, minSessions: 2 } },
];

export type QuestView = {
  id: string;
  text: string;
  current: number;
  goal: number;
  reward: number;
  done: boolean;
  numbers: number[];
};

export type ProgressView = {
  xp: number;
  level: number;
  rank: string;
  into: number;
  need: number;
  attributes: { id: AttributeId; label: string; hint: string; level: number }[];
  skills: (SkillDef & { unlocked: boolean })[];
  titles: { id: string; title: string }[];
  quests: QuestView[];
};

export type SystemEvent = {
  id: string;
  kind: "nivel" | "habilidade" | "missao";
  title: string;
  text: string;
};

export function xpToAdvance(level: number): number {
  return 180 + (level - 1) * 110;
}

export function levelFromXp(xp: number): { level: number; into: number; need: number; rank: string } {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  let need = xpToAdvance(level);
  while (rest >= need && level < 99) {
    rest -= need;
    level += 1;
    need = xpToAdvance(level);
  }
  return { level, into: rest, need, rank: rankFor(level) };
}

export function rankFor(level: number): string {
  if (level >= 30) return "Ápice";
  if (level >= 20) return "Núcleo";
  if (level >= 15) return "Lâmina";
  if (level >= 10) return "Aço";
  if (level >= 5) return "Brasa";
  return "Centelha";
}

function legal(id: string, modality: Modality): boolean {
  const item = TECHNIQUE.get(id);
  if (!item) return false;
  return item.modality === "both" || item.modality === modality;
}

function familyOf(id: string, category?: Category): AttributeId | null {
  if (PES.has(id)) return "pes";
  if (PESCOCO.has(id)) return "pescoco";
  if (BRACOS.has(id)) return "bracos";
  if (COSTAS.has(id)) return "costas";
  if (GUARDA.has(id) || category === "raspagem") return "guarda";
  if (category === "queda") return "quedas";
  if (category === "passagem") return "passagem";
  if (category === "escape") return "defesa";
  const known = TECHNIQUE.get(id);
  if (!known) return null;
  if (known.category === "queda") return "quedas";
  if (known.category === "passagem") return "passagem";
  if (known.category === "raspagem") return "guarda";
  if (known.category === "escape") return "defesa";
  return null;
}

type DayBucket = {
  date: string;
  minutes: number;
  rolas: number;
  sessions: Set<string>;
  subs: number;
  suffered: number;
  points: number;
  families: Record<AttributeId, number>;
};

function emptyFamilies(): Record<AttributeId, number> {
  return { quedas: 0, passagem: 0, guarda: 0, costas: 0, pes: 0, pescoco: 0, bracos: 0, defesa: 0, presenca: 0 };
}

function buckets(rolas: ProgressRola[]): DayBucket[] {
  const map = new Map<string, DayBucket>();
  for (const rola of rolas) {
    const day = map.get(rola.occurredOn) ?? {
      date: rola.occurredOn,
      minutes: 0,
      rolas: 0,
      sessions: new Set<string>(),
      subs: 0,
      suffered: 0,
      points: 0,
      families: emptyFamilies(),
    };
    day.rolas += 1;
    day.sessions.add(rola.sessionId);
    day.minutes += Math.min(PROGRESSION.minutePerRola, Math.max(0, rola.durationMinutes));
    day.points += Math.max(0, rola.pointsFor);
    const seen = new Set<string>();
    const add = (item: { id: string; category?: Category }, finish: boolean) => {
      if (seen.has(item.id) || !legal(item.id, rola.modality)) return;
      seen.add(item.id);
      const family = familyOf(item.id, item.category);
      if (!family) return;
      const finishOnly = family === "pes" || family === "pescoco" || family === "bracos";
      if (finishOnly && !finish) return;
      day.families[family] += 1;
    };
    for (const item of rola.techniquesUsed) add(item, false);
    for (const item of rola.submissionsApplied) add(item, true);
    day.subs += rola.submissionsApplied.filter((item) => legal(item.id, rola.modality)).length;
    day.suffered += rola.submissionsSuffered.length;
    map.set(rola.occurredOn, day);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function ritmoBonus(days: DayBucket[], index: number): number {
  let chain = 1;
  for (let cursor = index; cursor > 0; cursor -= 1) {
    const gap = daysBetween(days[cursor - 1]!.date, days[cursor]!.date);
    if (gap <= 0 || gap > PROGRESSION.ritmoGapDays) break;
    chain += 1;
  }
  return Math.min(PROGRESSION.ritmoCap, chain - 1) * PROGRESSION.ritmoStep;
}

function daysBetween(start: string, end: string): number {
  return Math.round((parseIso(end).getTime() - parseIso(start).getTime()) / 86_400_000);
}

export function dayXp(day: DayBucket, ritmo: number): number {
  const raw = PROGRESSION.showUp
    + Math.min(PROGRESSION.minuteCap, day.minutes) * PROGRESSION.perMinute
    + Math.min(PROGRESSION.rolaCap, day.rolas) * PROGRESSION.perRola
    + Math.min(PROGRESSION.subCap, day.subs) * PROGRESSION.perSub
    + Math.min(PROGRESSION.pointCap, day.points) * PROGRESSION.perPoint
    + ritmo;
  return Math.min(PROGRESSION.dailyCap, raw);
}

function attributeLevel(count: number): number {
  if (count <= 0) return 0;
  return Math.min(PROGRESSION.attributeCap, Math.floor(Math.sqrt(count) * 2));
}

function startOfWeek(iso: string): string {
  const day = parseIso(iso).getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(iso, diff);
}

function inWindow(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

type WindowStats = {
  trainings: number;
  rolas: number;
  suffered: number;
  families: Record<AttributeId, number>;
};

function windowStats(days: DayBucket[], start: string, end: string): WindowStats {
  const stats: WindowStats = { trainings: 0, rolas: 0, suffered: 0, families: emptyFamilies() };
  const sessions = new Set<string>();
  for (const day of days) {
    if (!inWindow(day.date, start, end)) continue;
    stats.rolas += day.rolas;
    stats.suffered += day.suffered;
    for (const id of Object.keys(day.families) as AttributeId[]) stats.families[id] += day.families[id];
    for (const session of day.sessions) sessions.add(session);
  }
  stats.trainings = sessions.size;
  return stats;
}

const FOCUS: AttributeId[] = ["quedas", "passagem", "guarda", "pes", "pescoco", "bracos"];

function weakest(stats: WindowStats): AttributeId {
  return FOCUS.reduce((low, id) => (stats.families[id] < stats.families[low] ? id : low), FOCUS[0]!);
}

function questText(attribute: AttributeId, goal: number): string {
  const label = ATTRIBUTES.find((item) => item.id === attribute)?.label.toLowerCase() ?? attribute;
  if (attribute === "pescoco") return `Finalize ${goal}x com estrangulamento.`;
  if (attribute === "pes") return `Finalize ${goal}x com chave de perna.`;
  if (attribute === "bracos") return `Finalize ${goal}x com chave de braço.`;
  if (attribute === "passagem") return `Passe a guarda ${goal}x.`;
  if (attribute === "quedas") return `Complete ${goal} quedas.`;
  if (attribute === "guarda") return `Raspe ou use a guarda ${goal}x.`;
  return `Some ${goal} ações de ${label}.`;
}

function weekQuests(days: DayBucket[], weekStart: string, today: string): { views: QuestView[]; reward: number } {
  const end = addDays(weekStart, 6);
  const current = windowStats(days, weekStart, end > today ? today : end);
  const priorEnd = addDays(weekStart, -1);
  const prior = windowStats(days, addDays(weekStart, -7), priorEnd);
  const focus = weakest(prior.rolas > 0 ? prior : current);
  const suffer = prior.rolas >= MIN_BASELINE && prior.suffered / prior.rolas >= 0.34;
  const views: QuestView[] = [];
  const trainGoal = 3;
  views.push({
    id: `sem:${weekStart}:treinar`,
    text: `Treine ${trainGoal}x esta semana.`,
    current: Math.min(trainGoal, current.trainings),
    goal: trainGoal,
    reward: 30,
    done: current.trainings >= trainGoal,
    numbers: [trainGoal, current.trainings, 30],
  });
  if (suffer) {
    const goalRolas = 2;
    const maxSuffered = 1;
    const failed = current.suffered > maxSuffered;
    const currentValue = failed ? 0 : Math.min(goalRolas, current.rolas);
    views.push({
      id: `sem:${weekStart}:defesa`,
      text: `Role ${goalRolas}x e sofra no máximo ${maxSuffered} finalização.`,
      current: currentValue,
      goal: goalRolas,
      reward: 30,
      done: !failed && current.rolas >= goalRolas,
      numbers: [goalRolas, maxSuffered, current.suffered, 30],
    });
  } else {
    const goal = 3;
    views.push({
      id: `sem:${weekStart}:${focus}`,
      text: questText(focus, goal),
      current: Math.min(goal, current.families[focus]),
      goal,
      reward: 30,
      done: current.families[focus] >= goal,
      numbers: [goal, current.families[focus], 30],
    });
  }
  const reward = Math.min(PROGRESSION.questWeekCap, views.reduce((sum, quest) => sum + (quest.done ? quest.reward : 0), 0));
  return { views, reward };
}

function monthQuest(days: DayBucket[], monthStart: string, today: string): QuestView {
  const end = today.startsWith(monthStart.slice(0, 7)) ? today : lastOfMonth(monthStart);
  const current = windowStats(days, monthStart, end);
  const priorStart = addDays(monthStart, -1).slice(0, 7) + "-01";
  const prior = windowStats(days, priorStart, addDays(monthStart, -1));
  const focus = weakest(prior.rolas > 0 ? prior : current);
  const goal = 8;
  return {
    id: `mes:${monthStart}:${focus}`,
    text: `No mês: ${questText(focus, goal)}`,
    current: Math.min(goal, current.families[focus]),
    goal,
    reward: 50,
    done: current.families[focus] >= goal,
    numbers: [goal, current.families[focus], 50],
  };
}

function lastOfMonth(monthStart: string): string {
  const date = parseIso(monthStart);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return todayIso(end);
}

function countIds(days: DayBucket[], ids: Set<string> | null, submissionsOnly: boolean, rolas: ProgressRola[]): number {
  if (!ids && !submissionsOnly) return 0;
  let total = 0;
  for (const rola of rolas) {
    const pool = submissionsOnly ? rola.submissionsApplied : [...rola.techniquesUsed, ...rola.submissionsApplied];
    const seen = new Set<string>();
    for (const item of pool) {
      if (seen.has(item.id) || !legal(item.id, rola.modality)) continue;
      if (ids && !ids.has(item.id)) continue;
      seen.add(item.id);
      total += 1;
    }
  }
  return submissionsOnly && !ids ? rolas.reduce((sum, rola) => sum + rola.submissionsApplied.filter((item) => legal(item.id, rola.modality)).length, total) : total;
}

function rateUnlock(days: DayBucket[], attribute: AttributeId, percent: number, minEvents: number, today: string): boolean {
  const month = monthBounds(today);
  const previous = monthBounds(addDays(month.start, -1));
  const current = windowStats(days, month.start, today);
  const prior = windowStats(days, previous.start, previous.end);
  if (prior.rolas < MIN_BASELINE || current.families[attribute] < minEvents) return false;
  const delta = compareMetric(
    current.families[attribute] / Math.max(1, current.rolas),
    prior.families[attribute] / Math.max(1, prior.rolas),
    true,
    prior.rolas,
    "rate",
  );
  return delta.pct !== null && delta.pct >= percent;
}

function monthBounds(iso: string): { start: string; end: string } {
  const start = `${iso.slice(0, 7)}-01`;
  return { start, end: lastOfMonth(start) };
}

function defenseUnlock(days: DayBucket[], escapes: number, percent: number, today: string): boolean {
  const totals = days.reduce((sum, day) => sum + day.families.defesa, 0);
  if (totals < escapes) return false;
  const month = monthBounds(today);
  const previous = monthBounds(addDays(month.start, -1));
  const current = windowStats(days, month.start, today);
  const prior = windowStats(days, previous.start, previous.end);
  if (prior.rolas < MIN_BASELINE || current.rolas < MIN_BASELINE) return false;
  const delta = compareMetric(
    current.suffered / current.rolas,
    prior.suffered / prior.rolas,
    false,
    prior.rolas,
    "rate",
  );
  return delta.good === true && (delta.pct ?? 0) <= -percent;
}

function weekStreak(days: DayBucket[], weeks: number, minSessions: number, today: string): boolean {
  let cursor = startOfWeek(today);
  for (let index = 0; index < weeks; index += 1) {
    const stats = windowStats(days, cursor, addDays(cursor, 6));
    if (stats.trainings < minSessions) return false;
    cursor = addDays(cursor, -7);
  }
  return true;
}

function skillUnlocked(skill: SkillDef, days: DayBucket[], rolas: ProgressRola[], today: string): boolean {
  const rule = skill.rule;
  if (rule.type === "count") {
    if (rule.attribute === "presenca" && !rule.ids && !rule.submissions) return days.length >= rule.atLeast;
    if (rule.submissions && !rule.ids) {
      return rolas.reduce((sum, rola) => sum + rola.submissionsApplied.filter((item) => legal(item.id, rola.modality)).length, 0) >= rule.atLeast;
    }
    if (rule.attribute && !rule.ids) {
      return days.reduce((sum, day) => sum + day.families[rule.attribute!], 0) >= rule.atLeast;
    }
    return countIds(days, rule.ids ? new Set(rule.ids) : null, Boolean(rule.submissions), rolas) >= rule.atLeast;
  }
  if (rule.type === "rate") return rateUnlock(days, rule.attribute, rule.percent, rule.minEvents, today);
  if (rule.type === "weeks") return weekStreak(days, rule.weeks, rule.minSessions, today);
  return defenseUnlock(days, rule.escapes, rule.percent, today);
}

export function buildProgress(rolas: ProgressRola[], today: string): ProgressView {
  const days = buckets(rolas);
  let xp = 0;
  days.forEach((day, index) => {
    xp += dayXp(day, ritmoBonus(days, index));
  });

  const first = days[0]?.date ?? today;
  let cursor = startOfWeek(first);
  const currentWeek = startOfWeek(today);
  const currentQuests: QuestView[] = [];
  while (cursor <= currentWeek) {
    const week = weekQuests(days, cursor, today);
    xp += week.reward;
    if (cursor === currentWeek) currentQuests.push(...week.views);
    cursor = addDays(cursor, 7);
  }
  const monthStart = `${today.slice(0, 7)}-01`;
  let monthCursor = `${first.slice(0, 7)}-01`;
  while (monthCursor <= monthStart) {
    const quest = monthQuest(days, monthCursor, today);
    if (quest.done) xp += Math.min(50, quest.reward);
    if (monthCursor === monthStart) currentQuests.push(quest);
    const next = parseIso(monthCursor);
    next.setMonth(next.getMonth() + 1);
    monthCursor = todayIso(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  const totals = emptyFamilies();
  for (const day of days) {
    for (const id of Object.keys(totals) as AttributeId[]) totals[id] += day.families[id];
  }
  totals.presenca = days.length;
  const level = levelFromXp(xp);
  const skills = SKILLS.map((skill) => ({ ...skill, unlocked: skillUnlocked(skill, days, rolas, today) }));
  const attributes = ATTRIBUTES.map((item) => {
    let value = attributeLevel(totals[item.id]);
    if (item.id === "defesa" && days.reduce((sum, day) => sum + day.rolas, 0) >= 8) {
      const suffered = days.reduce((sum, day) => sum + day.suffered, 0);
      const rolaCount = days.reduce((sum, day) => sum + day.rolas, 0);
      if (suffered / rolaCount <= 0.15) value = Math.min(PROGRESSION.attributeCap, value + 4);
    }
    if (item.id === "presenca") {
      const recentStart = addDays(today, -27);
      const recent = days.filter((day) => day.date >= recentStart).length;
      value = Math.min(PROGRESSION.attributeCap, Math.round((recent / 12) * PROGRESSION.attributeCap));
    }
    return { ...item, level: value };
  });
  return {
    xp,
    level: level.level,
    rank: level.rank,
    into: level.into,
    need: level.need,
    attributes,
    skills,
    titles: skills.filter((skill) => skill.unlocked).map((skill) => ({ id: skill.id, title: skill.title })),
    quests: currentQuests,
  };
}

export function diffProgress(before: ProgressView, after: ProgressView): SystemEvent[] {
  const events: SystemEvent[] = [];
  if (after.level > before.level) {
    events.push({
      id: `nivel-${after.level}`,
      kind: "nivel",
      title: `Nível ${after.level}`,
      text: after.rank,
    });
  }
  const known = new Set(before.skills.filter((skill) => skill.unlocked).map((skill) => skill.id));
  for (const skill of after.skills) {
    if (skill.unlocked && !known.has(skill.id)) {
      events.push({ id: skill.id, kind: "habilidade", title: skill.title, text: skill.name });
    }
  }
  const done = new Set(before.quests.filter((quest) => quest.done).map((quest) => quest.id));
  for (const quest of after.quests) {
    if (quest.done && !done.has(quest.id)) {
      events.push({ id: quest.id, kind: "missao", title: "Missão", text: quest.text });
    }
  }
  return events;
}

/** Ponto de extensão para push. Hoje só avisa a interface. */
export function queueProgressPush(events: SystemEvent[]): void {
  if (typeof window === "undefined" || events.length === 0) return;
  window.dispatchEvent(new CustomEvent("tatame-progress", { detail: events }));
}

export function titleFor(view: ProgressView, equippedId: string | null | undefined): string | null {
  const chosen = view.titles.find((item) => item.id === equippedId);
  return chosen?.title ?? view.titles.at(-1)?.title ?? null;
}
