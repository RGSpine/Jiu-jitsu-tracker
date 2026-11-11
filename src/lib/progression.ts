import { techniques } from "@/data/catalog";
import { addDays, parseIso, todayIso } from "@/lib/dates";
import { MIN_BASELINE } from "@/lib/metrics";
import type { Category, Modality, Result } from "@/lib/types";

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
  | "queda"
  | "passagem"
  | "raspagem"
  | "guarda"
  | "costas"
  | "pes"
  | "estrangulamento"
  | "defesa"
  | "pontuacao";

export const ATTRIBUTES: { id: AttributeId; label: string; short: string; hint: string }[] = [
  { id: "queda", label: "Queda", short: "Queda", hint: "Levar ao chão" },
  { id: "passagem", label: "Passagem", short: "Passe", hint: "Passar a guarda" },
  { id: "raspagem", label: "Raspagem", short: "Raspa", hint: "Raspar" },
  { id: "guarda", label: "Guarda", short: "Guarda", hint: "Segurar a guarda" },
  { id: "costas", label: "Costas", short: "Costas", hint: "Pegar as costas" },
  { id: "pes", label: "Ataque de pés", short: "Pés", hint: "Entrar na perna" },
  { id: "estrangulamento", label: "Estrangulamento", short: "Estrang.", hint: "Finalizar no pescoço" },
  { id: "defesa", label: "Defesa", short: "Defesa", hint: "Sair de posição" },
  { id: "pontuacao", label: "Pontuação", short: "Pontos", hint: "Marcar pontos" },
];

const PES = new Set(["heel-hook", "kneebar", "chave-de-tornozelo", "toe-hold", "leg-lock", "ashi-garami", "saddle", "cross-ashi"]);
const CHOKE = new Set(["triangulo", "triangulo-invertido", "guilhotina", "ezekiel", "relogio", "arco-e-flecha", "estrangulamento-lapela", "katagatame", "anaconda", "darce", "estrangulamento-canto", "loop-choke", "norte-sul", "mata-leao"]);
/** Chaves de braço dão XP de finalização e títulos, mas não entram em atributo. */
const ARMS = new Set(["armlock", "kimura", "americana", "omoplata"]);
const GUARD = new Set(["guarda-fechada", "meia-guarda", "de-la-riva", "guarda-sentada", "guarda-x", "guarda-aranha"]);
const BACK = new Set(["pegada-nas-costas"]);

const TECHNIQUE = new Map(techniques.map((item) => [item.id, item]));

export type ProgressRola = {
  occurredOn: string;
  modality: Modality;
  durationMinutes: number;
  sessionId: string;
  pointsFor: number;
  pointsAgainst?: number;
  result?: Result;
  submissionsApplied: { id: string }[];
  submissionsSuffered: { id: string }[];
  techniquesUsed: { id: string; category?: Category }[];
};

type HonorRule =
  | { type: "attr"; attribute: AttributeId; atLeast: number }
  | { type: "subs"; atLeast: number }
  | { type: "arms"; atLeast: number }
  | { type: "foot-finishes"; atLeast: number; minRolas: number }
  | { type: "chokes"; atLeast: number }
  | { type: "backs"; atLeast: number }
  | { type: "points"; atLeast: number }
  | { type: "days"; atLeast: number }
  | { type: "weeks"; weeks: number; minSessions: number }
  | { type: "impassable"; rolas: number; maxRate: number; escapes: number }
  | { type: "id"; id: string; atLeast: number }
  | { type: "behind"; atLeast: number }
  | { type: "rolas"; atLeast: number }
  | { type: "epithet"; id: "duro" | "constante" | "preciso" | "frio" };

export type TitleTier = { id: string; name: string; hint: string; rule: HonorRule };
export type TitleLine = { id: string; label: string; hidden: boolean; tiers: TitleTier[] };

export const TITLE_LINES: TitleLine[] = [
  { id: "queda", label: "Queda", hidden: false, tiers: [
    { id: "quedador-1", name: "Quedador", hint: "8 quedas", rule: { type: "attr", attribute: "queda", atLeast: 8 } },
    { id: "quedador-2", name: "Quedador firme", hint: "25 quedas", rule: { type: "attr", attribute: "queda", atLeast: 25 } },
    { id: "quedador-3", name: "Mão de queda", hint: "60 quedas", rule: { type: "attr", attribute: "queda", atLeast: 60 } },
  ] },
  { id: "passagem", label: "Passagem", hidden: false, tiers: [
    { id: "passador-1", name: "Passador", hint: "12 passagens", rule: { type: "attr", attribute: "passagem", atLeast: 12 } },
    { id: "passador-2", name: "Passador fundo", hint: "35 passagens", rule: { type: "attr", attribute: "passagem", atLeast: 35 } },
    { id: "passador-3", name: "Trator Humano", hint: "80 passagens", rule: { type: "attr", attribute: "passagem", atLeast: 80 } },
  ] },
  { id: "raspagem", label: "Raspagem", hidden: false, tiers: [
    { id: "raspador-1", name: "Raspador", hint: "8 raspagens", rule: { type: "attr", attribute: "raspagem", atLeast: 8 } },
    { id: "raspador-2", name: "Raspador fundo", hint: "25 raspagens", rule: { type: "attr", attribute: "raspagem", atLeast: 25 } },
    { id: "raspador-3", name: "Onda", hint: "55 raspagens", rule: { type: "attr", attribute: "raspagem", atLeast: 55 } },
  ] },
  { id: "guarda", label: "Guarda", hidden: false, tiers: [
    { id: "guardeiro-1", name: "Guardeiro", hint: "8 guardas", rule: { type: "attr", attribute: "guarda", atLeast: 8 } },
    { id: "guardeiro-2", name: "Guardeiro fundo", hint: "24 guardas", rule: { type: "attr", attribute: "guarda", atLeast: 24 } },
    { id: "guardeiro-3", name: "Casa", hint: "50 guardas", rule: { type: "attr", attribute: "guarda", atLeast: 50 } },
  ] },
  { id: "defesa", label: "Defesa", hidden: false, tiers: [
    { id: "defesa-1", name: "Muro", hint: "12 saídas", rule: { type: "attr", attribute: "defesa", atLeast: 12 } },
    { id: "defesa-2", name: "Guarda Impassável", hint: "20 rolas e pouca finalização sofrida", rule: { type: "impassable", rolas: 20, maxRate: 0.2, escapes: 12 } },
    { id: "defesa-3", name: "O Impassável", hint: "40 rolas e quase não apanha finalização", rule: { type: "impassable", rolas: 40, maxRate: 0.12, escapes: 20 } },
  ] },
  { id: "costas", label: "Costas", hidden: false, tiers: [
    { id: "costas-1", name: "Pegada", hint: "5 pegadas nas costas", rule: { type: "backs", atLeast: 5 } },
    { id: "costas-2", name: "Costas firmes", hint: "15 pegadas nas costas", rule: { type: "backs", atLeast: 15 } },
    { id: "costas-3", name: "Dono das costas", hint: "35 pegadas nas costas", rule: { type: "backs", atLeast: 35 } },
  ] },
  { id: "pes", label: "Ataque de pés", hidden: false, tiers: [
    { id: "pe-1", name: "Pegador de Pé", hint: "8 ataques de perna", rule: { type: "attr", attribute: "pes", atLeast: 8 } },
    { id: "pe-2", name: "Caçador de Pé", hint: "8 finalizações de perna", rule: { type: "foot-finishes", atLeast: 8, minRolas: 8 } },
    { id: "pe-3", name: "Finalizador de Pé", hint: "18 finalizações de perna em amostra", rule: { type: "foot-finishes", atLeast: 18, minRolas: 16 } },
  ] },
  { id: "estrangulamento", label: "Estrangulamento", hidden: false, tiers: [
    { id: "neck-1", name: "Estrangulador", hint: "5 estrangulamentos", rule: { type: "chokes", atLeast: 5 } },
    { id: "neck-2", name: "Estrangulador fundo", hint: "15 estrangulamentos", rule: { type: "chokes", atLeast: 15 } },
    { id: "neck-3", name: "Laço fechado", hint: "35 estrangulamentos", rule: { type: "chokes", atLeast: 35 } },
  ] },
  { id: "pontuacao", label: "Pontuação", hidden: false, tiers: [
    { id: "pts-1", name: "Pontuador", hint: "30 pontos", rule: { type: "points", atLeast: 30 } },
    { id: "pts-2", name: "Pontuador fundo", hint: "100 pontos", rule: { type: "points", atLeast: 100 } },
    { id: "pts-3", name: "Placar alto", hint: "250 pontos", rule: { type: "points", atLeast: 250 } },
  ] },
  { id: "final", label: "Finalização", hidden: false, tiers: [
    { id: "fin-1", name: "Finalizador", hint: "10 finalizações", rule: { type: "subs", atLeast: 10 } },
    { id: "fin-2", name: "Finalizador fundo", hint: "30 finalizações", rule: { type: "subs", atLeast: 30 } },
    { id: "fin-3", name: "Ceifador", hint: "60 finalizações", rule: { type: "subs", atLeast: 60 } },
  ] },
  { id: "rotina", label: "Presença", hidden: false, tiers: [
    { id: "rotina-1", name: "Presente", hint: "6 dias de treino", rule: { type: "days", atLeast: 6 } },
    { id: "rotina-2", name: "Rotina", hint: "4 semanas com 2 treinos", rule: { type: "weeks", weeks: 4, minSessions: 2 } },
    { id: "rotina-3", name: "Fio", hint: "8 semanas com 2 treinos", rule: { type: "weeks", weeks: 8, minSessions: 2 } },
  ] },
  { id: "surpresa-triangulo", label: "Surpresa", hidden: true, tiers: [
    { id: "surpresa-triangulo", name: "Triângulo", hint: "???", rule: { type: "id", id: "triangulo", atLeast: 1 } },
  ] },
  { id: "surpresa-chave", label: "Surpresa", hidden: true, tiers: [
    { id: "surpresa-chave", name: "Chave", hint: "???", rule: { type: "arms", atLeast: 1 } },
  ] },
  { id: "surpresa-centena", label: "Surpresa", hidden: true, tiers: [
    { id: "surpresa-centena", name: "Centena", hint: "???", rule: { type: "rolas", atLeast: 100 } },
  ] },
  { id: "surpresa-virada", label: "Surpresa", hidden: true, tiers: [
    { id: "surpresa-virada", name: "Virada", hint: "???", rule: { type: "behind", atLeast: 1 } },
  ] },
];

export const EPITHETS: { id: string; label: string; hint: string; rule: HonorRule }[] = [
  { id: "o-duro", label: "o Duro", hint: "Difícil de finalizar, com amostra", rule: { type: "epithet", id: "duro" } },
  { id: "o-constante", label: "o Constante", hint: "Seis semanas firmes", rule: { type: "epithet", id: "constante" } },
  { id: "o-preciso", label: "o Preciso", hint: "Pontua mais do que leva", rule: { type: "epithet", id: "preciso" } },
  { id: "o-frio", label: "o Frio", hint: "Finaliza com frequência", rule: { type: "epithet", id: "frio" } },
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

export type SystemLogEntry = {
  id: string;
  kind: "titulo" | "epiteto" | "atributo" | "posto" | "missao" | "surpresa";
  body: string;
  occurredOn: string;
  read?: boolean;
};

export type LineView = {
  id: string;
  label: string;
  hidden: boolean;
  unlocked: boolean;
  name: string;
  hint: string;
  tier: number;
  tiers: number;
};

export type ProgressView = {
  xp: number;
  level: number;
  rank: string;
  into: number;
  need: number;
  attributes: { id: AttributeId; label: string; short: string; hint: string; level: number }[];
  lines: LineView[];
  titles: { id: string; title: string }[];
  epithets: { id: string; label: string; hint: string; unlocked: boolean }[];
  quests: QuestView[];
  log: SystemLogEntry[];
};

export type SystemEvent = {
  id: string;
  kind: SystemLogEntry["kind"];
  body: string;
};

type Totals = {
  families: Record<AttributeId, number>;
  armLocks: number;
  footFinishes: number;
  chokeFinishes: number;
  subs: number;
  rolas: number;
  nogiRolas: number;
  suffered: number;
  pointsFor: number;
  pointsAgainst: number;
  wins: number;
  losses: number;
  behind: number;
  triangles: number;
  days: number;
};

function emptyFamilies(): Record<AttributeId, number> {
  return { queda: 0, passagem: 0, raspagem: 0, guarda: 0, costas: 0, pes: 0, estrangulamento: 0, defesa: 0, pontuacao: 0 };
}

function emptyTotals(): Totals {
  return {
    families: emptyFamilies(),
    armLocks: 0,
    footFinishes: 0,
    chokeFinishes: 0,
    subs: 0,
    rolas: 0,
    nogiRolas: 0,
    suffered: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    wins: 0,
    losses: 0,
    behind: 0,
    triangles: 0,
    days: 0,
  };
}

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
  if (ARMS.has(id)) return null;
  if (PES.has(id)) return "pes";
  if (CHOKE.has(id)) return "estrangulamento";
  if (BACK.has(id)) return "costas";
  if (GUARD.has(id)) return "guarda";
  if (category === "queda") return "queda";
  if (category === "passagem") return "passagem";
  if (category === "raspagem") return "raspagem";
  if (category === "escape") return "defesa";
  const known = TECHNIQUE.get(id);
  if (!known) return null;
  if (known.category === "queda") return "queda";
  if (known.category === "passagem") return "passagem";
  if (known.category === "raspagem") return "raspagem";
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
  armLocks: number;
  footFinishes: number;
  chokeFinishes: number;
  nogiRolas: number;
  pointsAgainst: number;
  wins: number;
  losses: number;
  behind: number;
  triangles: number;
};

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
      armLocks: 0,
      footFinishes: 0,
      chokeFinishes: 0,
      nogiRolas: 0,
      pointsAgainst: 0,
      wins: 0,
      losses: 0,
      behind: 0,
      triangles: 0,
    };
    day.rolas += 1;
    if (rola.modality === "nogi") day.nogiRolas += 1;
    day.sessions.add(rola.sessionId);
    day.minutes += Math.min(PROGRESSION.minutePerRola, Math.max(0, rola.durationMinutes));
    day.points += Math.max(0, rola.pointsFor);
    day.families.pontuacao += Math.max(0, rola.pointsFor);
    day.pointsAgainst += Math.max(0, rola.pointsAgainst ?? 0);
    if (rola.result === "vitoria") day.wins += 1;
    if (rola.result === "derrota") day.losses += 1;
    if (rola.result === "vitoria" && rola.pointsFor < (rola.pointsAgainst ?? 0)) day.behind += 1;
    const seen = new Set<string>();
    const add = (item: { id: string; category?: Category }, finish: boolean) => {
      if (seen.has(item.id) || !legal(item.id, rola.modality)) return;
      seen.add(item.id);
      if (ARMS.has(item.id)) {
        if (finish) day.armLocks += 1;
        return;
      }
      const family = familyOf(item.id, item.category);
      if (!family) return;
      if (family === "estrangulamento" && !finish) return;
      day.families[family] += 1;
      if (finish && family === "pes") day.footFinishes += 1;
      if (finish && family === "estrangulamento") day.chokeFinishes += 1;
      if (finish && item.id === "triangulo") day.triangles += 1;
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

export function dayXp(day: Pick<DayBucket, "minutes" | "rolas" | "subs" | "points">, ritmo: number): number {
  const raw = PROGRESSION.showUp
    + Math.min(PROGRESSION.minuteCap, day.minutes) * PROGRESSION.perMinute
    + Math.min(PROGRESSION.rolaCap, day.rolas) * PROGRESSION.perRola
    + Math.min(PROGRESSION.subCap, day.subs) * PROGRESSION.perSub
    + Math.min(PROGRESSION.pointCap, day.points) * PROGRESSION.perPoint
    + ritmo;
  return Math.min(PROGRESSION.dailyCap, raw);
}

function attributeLevel(id: AttributeId, count: number): number {
  const basis = id === "pontuacao" ? Math.floor(count / 4) : count;
  if (basis <= 0) return 0;
  return Math.min(PROGRESSION.attributeCap, Math.floor(Math.sqrt(basis) * 2));
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

const FOCUS: AttributeId[] = ["queda", "passagem", "raspagem", "guarda", "costas", "pes", "estrangulamento"];

function weakest(stats: WindowStats): AttributeId {
  return FOCUS.reduce((low, id) => (stats.families[id] < stats.families[low] ? id : low), FOCUS[0]!);
}

function questText(attribute: AttributeId, goal: number): string {
  if (attribute === "estrangulamento") return `Finalize ${goal}x com estrangulamento.`;
  if (attribute === "pes") return `Entre na perna ${goal}x.`;
  if (attribute === "passagem") return `Passe a guarda ${goal}x.`;
  if (attribute === "queda") return `Complete ${goal} quedas.`;
  if (attribute === "raspagem") return `Raspe ${goal}x.`;
  if (attribute === "guarda") return `Use a guarda ${goal}x.`;
  if (attribute === "costas") return `Pegue as costas ${goal}x.`;
  return `Some ${goal} ações.`;
}

function weekQuests(days: DayBucket[], weekStart: string, today: string): { views: QuestView[]; reward: number } {
  const end = addDays(weekStart, 6);
  const current = windowStats(days, weekStart, end > today ? today : end);
  const prior = windowStats(days, addDays(weekStart, -7), addDays(weekStart, -1));
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
    views.push({
      id: `sem:${weekStart}:defesa`,
      text: `Role ${goalRolas}x e sofra no máximo ${maxSuffered} finalização.`,
      current: failed ? 0 : Math.min(goalRolas, current.rolas),
      goal: goalRolas,
      reward: 30,
      done: !failed && current.rolas >= goalRolas,
      numbers: [goalRolas, maxSuffered, current.suffered, 30],
    });
  } else {
    const goal = focus === "pes" || focus === "estrangulamento" ? 2 : 3;
    const progress = focus === "pes" ? current.families.pes : current.families[focus];
    views.push({
      id: `sem:${weekStart}:${focus}`,
      text: questText(focus, goal),
      current: Math.min(goal, progress),
      goal,
      reward: 30,
      done: progress >= goal,
      numbers: [goal, progress, 30],
    });
  }
  const reward = Math.min(PROGRESSION.questWeekCap, views.reduce((sum, quest) => sum + (quest.done ? quest.reward : 0), 0));
  return { views, reward };
}

function monthQuest(days: DayBucket[], monthStart: string, today: string): QuestView {
  const end = today.startsWith(monthStart.slice(0, 7)) ? today : lastOfMonth(monthStart);
  const current = windowStats(days, monthStart, end);
  const priorStart = `${addDays(monthStart, -1).slice(0, 7)}-01`;
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
  return todayIso(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function streakWeeks(weeks: Map<string, number>, weekStart: string, length: number, minSessions: number): boolean {
  let cursor = weekStart;
  for (let index = 0; index < length; index += 1) {
    if ((weeks.get(cursor) ?? 0) < minSessions) return false;
    cursor = addDays(cursor, -7);
  }
  return true;
}

function ruleMet(rule: HonorRule, totals: Totals, weeks: Map<string, number>, weekStart: string): boolean {
  if (rule.type === "attr") return totals.families[rule.attribute] >= rule.atLeast;
  if (rule.type === "subs") return totals.subs >= rule.atLeast;
  if (rule.type === "arms") return totals.armLocks >= rule.atLeast;
  if (rule.type === "foot-finishes") return totals.footFinishes >= rule.atLeast && totals.rolas >= rule.minRolas;
  if (rule.type === "chokes") return totals.chokeFinishes >= rule.atLeast;
  if (rule.type === "backs") return totals.families.costas >= rule.atLeast;
  if (rule.type === "points") return totals.pointsFor >= rule.atLeast;
  if (rule.type === "days") return totals.days >= rule.atLeast;
  if (rule.type === "weeks") return streakWeeks(weeks, weekStart, rule.weeks, rule.minSessions);
  if (rule.type === "impassable") {
    return totals.rolas >= rule.rolas && totals.families.defesa >= rule.escapes && totals.suffered / totals.rolas <= rule.maxRate;
  }
  if (rule.type === "id") return totals.triangles >= rule.atLeast;
  if (rule.type === "behind") return totals.behind >= rule.atLeast;
  if (rule.type === "rolas") return totals.rolas >= rule.atLeast;
  const decided = totals.wins + totals.losses;
  if (rule.id === "duro") {
    return totals.rolas >= 24 && decided >= 16 && totals.wins / decided >= 0.5 && totals.suffered / totals.rolas <= 0.18;
  }
  if (rule.id === "constante") return streakWeeks(weeks, weekStart, 6, 2);
  if (rule.id === "preciso") {
    return totals.rolas >= 20 && totals.pointsFor >= 80 && totals.pointsFor >= totals.pointsAgainst * 1.4;
  }
  return totals.rolas >= 24 && totals.subs / totals.rolas >= 0.25;
}

function attributeLevels(totals: Totals): Record<AttributeId, number> {
  const levels = {} as Record<AttributeId, number>;
  for (const item of ATTRIBUTES) {
    let value = attributeLevel(item.id, totals.families[item.id]);
    if (item.id === "defesa" && totals.rolas >= 12 && totals.suffered / totals.rolas <= 0.15) {
      value = Math.min(PROGRESSION.attributeCap, value + 3);
    }
    levels[item.id] = value;
  }
  return levels;
}

function systemBody(kind: SystemLogEntry["kind"], label: string): string {
  if (kind === "titulo") return `[SISTEMA] Novo título adquirido: ${label}`;
  if (kind === "epiteto") return `[SISTEMA] Novo epíteto: ${label}`;
  if (kind === "atributo") return `[SISTEMA] ${label}`;
  if (kind === "posto") return `[SISTEMA] Novo posto: ${label}`;
  if (kind === "missao") return `[SISTEMA] Missão cumprida: ${label}`;
  return `[SISTEMA] Surpresa: ${label}`;
}

function addTotals(totals: Totals, day: DayBucket): void {
  totals.days += 1;
  totals.rolas += day.rolas;
  totals.nogiRolas += day.nogiRolas ?? 0;
  totals.subs += day.subs;
  totals.suffered += day.suffered;
  totals.pointsFor += day.points;
  totals.pointsAgainst += day.pointsAgainst ?? 0;
  totals.wins += day.wins ?? 0;
  totals.losses += day.losses ?? 0;
  totals.behind += day.behind ?? 0;
  totals.armLocks += day.armLocks ?? 0;
  totals.footFinishes += day.footFinishes ?? 0;
  totals.chokeFinishes += day.chokeFinishes ?? 0;
  totals.triangles += day.triangles ?? 0;
  for (const id of Object.keys(day.families) as AttributeId[]) totals.families[id] += day.families[id];
}

function replay(days: DayBucket[], today: string): { log: SystemLogEntry[]; xp: number } {
  const totals = emptyTotals();
  const weeks = new Map<string, number>();
  const latched = new Set<string>();
  const levels: Record<AttributeId, number> = { queda: 0, passagem: 0, raspagem: 0, guarda: 0, costas: 0, pes: 0, estrangulamento: 0, defesa: 0, pontuacao: 0 };
  let rank = "Centelha";
  let xp = 0;
  const log: SystemLogEntry[] = [];
  const questsDone = new Set<string>();
  const push = (id: string, kind: SystemLogEntry["kind"], label: string, occurredOn: string) => {
    if (latched.has(id)) return;
    latched.add(id);
    log.push({ id, kind, body: systemBody(kind, label), occurredOn });
  };

  days.forEach((day, index) => {
    if (day.date > today) return;
    xp += dayXp(day, ritmoBonus(days, index));
    addTotals(totals, day);
    const week = startOfWeek(day.date);
    weeks.set(week, (weeks.get(week) ?? 0) + day.sessions.size);
    const nextLevels = attributeLevels(totals);
    for (const item of ATTRIBUTES) {
      if (nextLevels[item.id] > levels[item.id]) {
        push(`atributo:${item.id}:${nextLevels[item.id]}`, "atributo", `${item.label} subiu para ${nextLevels[item.id]}`, day.date);
        levels[item.id] = nextLevels[item.id];
      }
    }
    const nextRank = levelFromXp(xp).rank;
    if (nextRank !== rank) {
      push(`posto:${nextRank}`, "posto", nextRank, day.date);
      rank = nextRank;
    }
    for (const line of TITLE_LINES) {
      for (const tier of line.tiers) {
        if (!ruleMet(tier.rule, totals, weeks, week)) continue;
        push(tier.id, line.hidden ? "surpresa" : "titulo", tier.name, day.date);
      }
    }
    for (const epithet of EPITHETS) {
      if (ruleMet(epithet.rule, totals, weeks, week)) push(epithet.id, "epiteto", epithet.label, day.date);
    }
  });

  const first = days[0]?.date ?? today;
  let cursor = startOfWeek(first);
  const currentWeek = startOfWeek(today);
  while (cursor <= currentWeek) {
    const week = weekQuests(days, cursor, today);
    for (const quest of week.views) {
      if (quest.done && !quest.id.endsWith(":treinar") && !questsDone.has(quest.id)) {
        questsDone.add(quest.id);
        push(quest.id, "missao", quest.text.replace(/\.$/, ""), addDays(cursor, 6) > today ? today : addDays(cursor, 6));
      }
    }
    cursor = addDays(cursor, 7);
  }
  return { log, xp };
}

export function buildProgress(rolas: ProgressRola[], today: string): ProgressView {
  const days = buckets(rolas);
  const played = replay(days, today);
  let xp = played.xp;
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

  const totals = emptyTotals();
  for (const day of days) {
    if (day.date <= today) addTotals(totals, day);
  }
  const earned = new Set(played.log.map((entry) => entry.id));
  const level = levelFromXp(xp);
  const lines: LineView[] = TITLE_LINES.map((line) => {
    const open = line.tiers.filter((tier) => earned.has(tier.id));
    const top = open.at(-1);
    const secret = line.hidden && !top;
    return {
      id: line.id,
      label: line.label,
      hidden: line.hidden,
      unlocked: Boolean(top),
      name: secret ? "???" : top?.name ?? line.tiers[0]?.name ?? "???",
      hint: secret ? "???" : top ? `${open.length}/${line.tiers.length}` : line.tiers[0]?.hint ?? "",
      tier: open.length,
      tiers: line.tiers.length,
    };
  });
  const titles = TITLE_LINES.flatMap((line) => line.tiers
    .filter((tier) => earned.has(tier.id))
    .map((tier) => ({ id: tier.id, title: tier.name })));
  const levels = attributeLevels(totals);
  return {
    xp,
    level: level.level,
    rank: level.rank,
    into: level.into,
    need: level.need,
    attributes: ATTRIBUTES.map((item) => ({ ...item, level: levels[item.id] })),
    lines,
    titles,
    epithets: EPITHETS.map((item) => ({
      id: item.id,
      label: item.label,
      hint: item.hint,
      unlocked: earned.has(item.id),
    })),
    quests: currentQuests,
    log: played.log,
  };
}

export function diffProgress(before: ProgressView, after: ProgressView): SystemEvent[] {
  const known = new Set(before.log.map((entry) => entry.id));
  return after.log
    .filter((entry) => !known.has(entry.id))
    .map((entry) => ({ id: entry.id, kind: entry.kind, body: entry.body }));
}

export function queueProgressPush(events: SystemEvent[]): void {
  if (typeof window === "undefined" || events.length === 0) return;
  window.dispatchEvent(new CustomEvent("tatame-progress", { detail: events }));
}

export function titleFor(view: ProgressView, equippedId: string | null | undefined): string | null {
  const chosen = view.titles.find((item) => item.id === equippedId);
  if (chosen) return chosen.title;
  const latest = [...view.log].reverse().find((entry) => entry.kind === "titulo");
  return latest?.body.split(": ").at(-1) ?? view.lines.find((line) => line.unlocked && !line.hidden)?.name ?? null;
}

export function epithetFor(view: ProgressView, equippedId: string | null | undefined): string | null {
  const chosen = view.epithets.find((item) => item.unlocked && item.id === equippedId);
  return chosen?.label ?? view.epithets.find((item) => item.unlocked)?.label ?? null;
}

export function presentation(name: string, epithet: string | null): string {
  const first = name.trim().split(/\s+/)[0] || name;
  return epithet ? `${first}, ${epithet}` : first;
}
