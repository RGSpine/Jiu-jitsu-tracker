import type {
  AgeDivision,
  Belt,
  Competition,
  CompetitionMatch,
  MatchMethod,
  MatchResult,
  MatchStage,
  Modality,
  Organization,
  Placement,
} from "@/lib/types";

export type ParsedMatch = Omit<CompetitionMatch, "id" | "competitionId">;
export type ParsedCompetition = {
  name: string;
  organization: Organization;
  date: string | null;
  year: number | null;
  city: string;
  modality: Modality | null;
  belt: Belt | null;
  ageDivision: AgeDivision;
  weightClass: string;
  absolute: boolean;
  status: Competition["status"];
  placement: Placement | null;
  absolutePlacement: Placement | null;
  notes: string;
  matches: ParsedMatch[];
};

const ORGS: { id: Organization; pattern: RegExp }[] = [
  { id: "ibjjf", pattern: /\bibjjf\b/i },
  { id: "cbjj", pattern: /\bcbjj\b/i },
  { id: "adcc", pattern: /\badcc\b/i },
  { id: "ajp", pattern: /\bajp\b/i },
];

const BELTS: { id: Belt; pattern: RegExp }[] = [
  { id: "branca", pattern: /\bbranca\b/i },
  { id: "azul", pattern: /\bazul\b/i },
  { id: "roxa", pattern: /\broxa\b/i },
  { id: "marrom", pattern: /\bmarrom\b/i },
  { id: "preta", pattern: /\bpreta\b/i },
];

export function parseCompetitionText(text: string): ParsedCompetition {
  const source = text.replace(/\s+/g, " ").trim();
  const year = source.match(/\b(20\d{2})\b/)?.[1] ?? null;
  const slash = source.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  const iso = source.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const date = iso
    ? iso[0]
    : slash
      ? `${slash[3]}-${slash[2]!.padStart(2, "0")}-${slash[1]!.padStart(2, "0")}`
      : null;
  const placement = readPlacement(source);
  const modality: Modality | null = /\bno-?gi\b/i.test(source) ? "nogi" : /\b(kimono|com gi)\b/i.test(source) ? "gi" : null;
  const organization = ORGS.find((item) => item.pattern.test(source))?.id ?? "outro";
  const belt = BELTS.find((item) => item.pattern.test(source))?.id ?? null;
  const ageDivision: AgeDivision = /\bjuvenil\b/i.test(source) ? "juvenil" : /\bmaster\b/i.test(source) ? "master" : "adulto";
  const weight = source.match(/\b(galo|pluma|pena|leve|médio|medio|meio-pesado|pesado|pesadíssimo|pesadissimo|superpesado)\b/i)?.[0] ?? "";
  const name = source.split(/[.,]/)[0]?.trim().slice(0, 80) || "Competição";
  return {
    name,
    organization,
    date,
    year: year ? Number(year) : null,
    city: "",
    modality,
    belt,
    ageDivision,
    weightClass: weight,
    absolute: /\babsoluto\b/i.test(source),
    status: placement ? "done" : "planned",
    placement,
    absolutePlacement: /\babsoluto\b/i.test(source) ? placement : null,
    notes: "",
    matches: readMatches(source),
  };
}

function readPlacement(text: string): Placement | null {
  if (/\bour[oa]\b/i.test(text)) return "ouro";
  if (/\bprata\b/i.test(text)) return "prata";
  if (/\bbronze\b/i.test(text)) return "bronze";
  if (/participa/i.test(text)) return "participacao";
  return null;
}

function readMatches(text: string): ParsedMatch[] {
  const pieces = text.split(/(?=contra\s+)/i);
  const chunks = pieces.flatMap((piece, index) => {
    if (!/^contra\s+/i.test(piece.trim())) return [];
    const prefix = pieces[index - 1]?.split(".").pop() ?? "";
    return [`${prefix} ${piece}`.trim()];
  });
  return chunks.map((chunk, index) => {
    const opponent = chunk.match(/contra\s+([^,.]{2,40})/i)?.[1]?.trim() || "Adversário";
    const result: MatchResult = /\b(perdi|derrota)\b/i.test(chunk) ? "derrota" : /\bempate\b/i.test(chunk) ? "empate" : "vitoria";
    const method = readMethod(chunk);
    const score = chunk.match(/(\d+)\s*(?:a|x)\s*(\d+)/i);
    const minutes = chunk.match(/(\d+)\s*min/i);
    return {
      order: index + 1,
      stage: readStage(chunk),
      opponentName: opponent,
      result,
      method,
      techniqueId: null,
      pointsFor: score ? Number(score[1]) : 0,
      pointsAgainst: score ? Number(score[2]) : 0,
      advantagesFor: 0,
      advantagesAgainst: 0,
      penaltiesFor: 0,
      penaltiesAgainst: 0,
      durationSeconds: minutes ? Number(minutes[1]) * 60 : 0,
      notes: "",
    };
  });
}

function readStage(text: string): MatchStage {
  if (/\babsoluto\b/i.test(text)) return "absoluto";
  if (/\bfinal\b/i.test(text)) return "final";
  if (/\bsemi\b/i.test(text)) return "semi";
  if (/\bquartas\b/i.test(text)) return "quartas";
  if (/\boitavas\b/i.test(text)) return "oitavas";
  return "outro";
}

function readMethod(text: string): MatchMethod {
  if (/\bfinaliza/i.test(text)) return "finalizacao";
  if (/\bvantagens\b/i.test(text)) return "vantagens";
  if (/\bpuni/i.test(text)) return "punicao";
  if (/\bdecis[aã]o\b/i.test(text) || /\bdecision\b/i.test(text)) return "decisao";
  if (/\bwo\b/i.test(text)) return "wo";
  if (/\bdq\b/i.test(text)) return "dq";
  return "pontos";
}

const NUMBER_FIELDS = ["pointsFor", "pointsAgainst", "advantagesFor", "advantagesAgainst", "penaltiesFor", "penaltiesAgainst", "durationSeconds"] as const;

export function numberIsInText(value: number, text: string): boolean {
  if (!Number.isFinite(value)) return false;
  if (value === 0) return true;
  const whole = String(Math.round(value));
  const pattern = new RegExp(`(^|[^\\d])${whole}([^\\d]|$)`);
  if (pattern.test(text)) return true;
  if (value > 60 && value % 60 === 0) return numberIsInText(value / 60, text);
  return false;
}

export function groundCompetition(raw: unknown, text: string): ParsedCompetition | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const local = parseCompetitionText(text);
  const placement = asPlacement(record.placement) ?? local.placement;
  const matches = Array.isArray(record.matches)
    ? record.matches.flatMap((item, index) => groundMatch(item, text, index))
    : local.matches;
  return {
    ...local,
    name: typeof record.name === "string" && record.name.trim() && textIncludes(text, record.name) ? record.name.trim().slice(0, 80) : local.name,
    organization: asOrg(record.organization) ?? local.organization,
    date: typeof record.date === "string" && textHasDate(text, record.date) ? record.date : local.date,
    modality: record.modality === "gi" || record.modality === "nogi" ? record.modality : local.modality,
    placement,
    status: record.status === "done" || record.status === "planned" ? record.status : local.status,
    matches: matches.length ? matches : local.matches,
  };
}

function groundMatch(raw: unknown, text: string, index: number): ParsedMatch[] {
  if (!raw || typeof raw !== "object") return [];
  const record = raw as Record<string, unknown>;
  const opponent = typeof record.opponentName === "string" ? record.opponentName.trim() : "";
  if (!opponent || !textIncludes(text, opponent)) return [];
  const match: ParsedMatch = {
    order: index + 1,
    stage: asStage(record.stage),
    opponentName: opponent.slice(0, 80),
    result: asResult(record.result),
    method: asMethod(record.method),
    techniqueId: null,
    pointsFor: 0,
    pointsAgainst: 0,
    advantagesFor: 0,
    advantagesAgainst: 0,
    penaltiesFor: 0,
    penaltiesAgainst: 0,
    durationSeconds: 0,
    notes: "",
  };
  for (const field of NUMBER_FIELDS) {
    const value = Number(record[field]);
    if (Number.isFinite(value) && value >= 0 && numberIsInText(value, text)) match[field] = Math.round(value);
  }
  return [match];
}

function textIncludes(text: string, value: string): boolean {
  return text.toLocaleLowerCase("pt-BR").includes(value.trim().toLocaleLowerCase("pt-BR"));
}

function textHasDate(text: string, iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  if (text.includes(iso)) return true;
  const [year, month, day] = iso.split("-");
  return text.includes(`${Number(day)}/${Number(month)}/${year}`) || text.includes(`${day}/${month}/${year}`) || text.includes(year!);
}

function asPlacement(value: unknown): Placement | null {
  if (value === "ouro" || value === "prata" || value === "bronze" || value === "participacao") return value;
  return null;
}

function asOrg(value: unknown): Organization | null {
  if (value === "ibjjf" || value === "cbjj" || value === "adcc" || value === "ajp" || value === "outro") return value;
  return null;
}

function asStage(value: unknown): MatchStage {
  if (value === "oitavas" || value === "quartas" || value === "semi" || value === "final" || value === "absoluto" || value === "outro") return value;
  return "outro";
}

function asResult(value: unknown): MatchResult {
  if (value === "vitoria" || value === "derrota" || value === "empate") return value;
  return "vitoria";
}

function asMethod(value: unknown): MatchMethod {
  if (value === "finalizacao" || value === "pontos" || value === "vantagens" || value === "punicao" || value === "decisao" || value === "dq" || value === "wo") return value;
  return "pontos";
}
