import { glossary, GLOSSARY_VERSION, type GlossaryEntry } from "@/data/glossary";
import { techniques } from "@/data/catalog";
import { normalizeText } from "@/lib/match-technique";
import type { Category, Technique } from "@/lib/types";

export { GLOSSARY_VERSION };

type Pattern = {
  id: string;
  phrase: string;
  category: Category;
};

const STOP_PHRASES = new Set(["de", "do", "da", "no", "na", "gi", "min", "um", "uma"]);

let cachedPatterns: Pattern[] | null = null;

function categoryOf(id: string): Category {
  return techniques.find((item) => item.id === id)?.category ?? "controle";
}

export function glossaryPatterns(): Pattern[] {
  if (cachedPatterns) return cachedPatterns;
  const byId = new Map(techniques.map((item) => [item.id, item]));
  const rows: Pattern[] = [];
  for (const entry of glossary) {
    const technique = byId.get(entry.id);
    const phrases = new Set<string>([
      entry.id.replaceAll("-", " "),
      ...(technique ? [technique.name, ...technique.aliases] : []),
      ...entry.aliases,
      ...entry.misspellings,
    ]);
    for (const phrase of phrases) {
      const normalized = normalizeText(phrase);
      if (normalized.length < 3 || STOP_PHRASES.has(normalized)) continue;
      rows.push({ id: entry.id, phrase: normalized, category: categoryOf(entry.id) });
    }
  }
  rows.sort((a, b) => b.phrase.length - a.phrase.length || a.phrase.localeCompare(b.phrase));
  cachedPatterns = rows;
  return rows;
}

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return glossary.find((entry) => entry.id === id);
}

function phraseAt(haystack: string, phrase: string, from: number): number {
  const needle = ` ${phrase} `;
  const found = haystack.indexOf(needle, from);
  return found < 0 ? -1 : found;
}

function mark(occupied: boolean[], start: number, end: number) {
  for (let index = start; index < end && index < occupied.length; index += 1) occupied[index] = true;
}

function overlaps(occupied: boolean[], start: number, end: number): boolean {
  for (let index = start; index < end; index += 1) if (occupied[index]) return true;
  return false;
}

function levenshtein(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let row = 0; row < rows; row += 1) matrix[row]![0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0]![col] = col;
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row]![col] = Math.min(
        matrix[row - 1]![col]! + 1,
        matrix[row]![col - 1]! + 1,
        matrix[row - 1]![col - 1]! + cost,
      );
    }
  }
  return matrix[left.length]![right.length]!;
}

export type TechniqueHit = {
  id: string;
  category: Category;
  start: number;
  end: number;
};

export function findTechniqueHits(text: string): TechniqueHit[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const haystack = ` ${normalized} `;
  const occupied = Array<boolean>(haystack.length).fill(false);
  const hits: TechniqueHit[] = [];

  for (const pattern of glossaryPatterns()) {
    let from = 0;
    while (from < haystack.length) {
      const at = phraseAt(haystack, pattern.phrase, from);
      if (at < 0) break;
      const start = at;
      const end = at + pattern.phrase.length + 2;
      if (!overlaps(occupied, start, end)) {
        mark(occupied, start, end);
        hits.push({ id: pattern.id, category: pattern.category, start, end });
      }
      from = at + pattern.phrase.length;
    }
  }

  const tokens = [...haystack.matchAll(/[a-z0-9]+/g)];
  const fuzzyAliases = glossaryPatterns().filter((pattern) => pattern.phrase.length >= 6);
  for (let size = 1; size <= 3; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const window = tokens.slice(index, index + size);
      const start = window[0]!.index ?? 0;
      const last = window[window.length - 1]!;
      const end = (last.index ?? 0) + last[0].length;
      if (overlaps(occupied, start, end)) continue;
      const phrase = window.map((token) => token[0]).join(" ");
      if (phrase.length < 6) continue;
      const candidate = fuzzyAliases.find((pattern) => {
        if (pattern.phrase.split(" ").length !== size) return false;
        return levenshtein(phrase, pattern.phrase) === 1;
      });
      if (!candidate) continue;
      mark(occupied, start, end);
      hits.push({ id: candidate.id, category: candidate.category, start, end });
    }
  }

  hits.sort((a, b) => a.start - b.start);
  const unique: TechniqueHit[] = [];
  for (const hit of hits) {
    if (unique.some((item) => item.id === hit.id && Math.abs(item.start - hit.start) < 4)) continue;
    unique.push(hit);
  }
  return unique;
}

export function matchTechnique(name: string, catalog: Technique[] = techniques): Technique | null {
  const needle = normalizeText(name);
  if (!needle) return null;
  const hits = findTechniqueHits(needle);
  const exact = hits.find((hit) => {
    const patterns = glossaryPatterns().filter((pattern) => pattern.id === hit.id);
    return patterns.some((pattern) => pattern.phrase === needle);
  });
  const chosen = exact ?? hits[0];
  if (!chosen) return null;
  return catalog.find((item) => item.id === chosen.id) ?? techniques.find((item) => item.id === chosen.id) ?? null;
}

const STT_PRIORITY = [
  "hell hook",
  "heel hook",
  "cross ash",
  "cross ashi",
  "botinha",
  "juji gatame",
  "sankaku",
  "kata gatame",
  "arm triangle",
  "false grip",
  "honey hole",
  "411",
  "o soto gari",
  "uchi mata",
  "hadaka jime",
  "mata leao",
  "ude garami",
  "kimura",
  "omoplata",
  "guilhotina",
  "darce",
  "ezequiel",
  "berimbolo",
  "toreando",
  "knee slice",
  "leg lock",
  "straight ankle",
];

export function glossaryPrompt(): string {
  const lines = glossary.map((entry) => {
    const technique = techniques.find((item) => item.id === entry.id);
    const words = [...new Set([technique?.name ?? entry.id, ...entry.aliases, ...entry.misspellings])];
    return `${entry.id} | ${words.join(", ")}`;
  });
  return [`Glossário de jiu-jitsu versão ${GLOSSARY_VERSION}.`, "Nos campos de técnica, devolva só o id canônico da primeira coluna.", ...lines].join("\n");
}

export function sttVocabularyPrompt(): string {
  const extras = glossary.flatMap((entry) => entry.misspellings.slice(0, 1));
  const ordered = [...STT_PRIORITY, ...extras];
  const unique: string[] = [];
  for (const term of ordered) {
    if (!unique.includes(term)) unique.push(term);
  }
  const lead = "Relato de jiu-jitsu no tatame. Termos: ";
  let body = "";
  for (const term of unique) {
    const next = body ? `${body}, ${term}` : term;
    if ((lead + next).length > 850) break;
    body = next;
  }
  return `${lead}${body}.`;
}
