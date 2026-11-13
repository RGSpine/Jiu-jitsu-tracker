import { findTechniqueHits, matchTechnique } from "@/lib/glossary-match";
import { normalizeText } from "@/lib/match-technique";
import type { ParsedRola, ParsedSession } from "@/lib/parse-draft";

const PARTNER_STOP = new Set([
  "de", "do", "da", "dos", "das", "no", "na", "num", "numa", "um", "uma", "o", "a", "os", "as",
  "e", "com", "sem", "por", "pra", "pro", "para", "min", "minutos", "rola", "rolas", "kimono",
  "nogi", "gi", "guarda", "finalizacao", "pontos", "vantagem", "depois", "antes", "mesmo",
  "mesma", "round", "seguinte", "ele", "ela", "eu", "me", "nao", "não",
]);

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

function partnerCandidates(clause: string): string[] {
  const patterns = [
    /(?:finalizei|fechei|peguei|venci|ganhei|perdi|empatei|passei|derrubei|derrubar)\s+(?:com\s+[oa]|contra\s+[oa]|para\s+[oa]|no|na|num|numa|pra|pro|de|o|a)?\s*([A-Za-zÀ-ú][\p{L}'’-]+)/giu,
    /(?:\bno|\bna|\bpra|\bpro|\bcom)\s+(?:[oa]\s+)?([A-Za-zÀ-ú][\p{L}'’-]+)/giu,
  ];
  const found: string[] = [];
  for (const pattern of patterns) {
    for (const match of clause.matchAll(pattern)) {
      const name = match[1]?.replace(/[.,;:!?]+$/g, "") ?? "";
      const normalized = normalizeText(name);
      if (normalized.length < 3 || PARTNER_STOP.has(normalized)) continue;
      if (matchTechnique(name)) continue;
      if (!found.some((item) => normalizeText(item) === normalized)) found.push(name);
    }
  }
  return found;
}

function scoreOf(clause: string, result: ParsedRola["result"]): { pointsFor: number; pointsAgainst: number } {
  const match = clause.match(/(\d+)\s*(?:a|x|×)\s*(\d+)/i);
  if (!match) return { pointsFor: 0, pointsAgainst: 0 };
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (result === "derrota") return { pointsFor: second, pointsAgainst: first };
  return { pointsFor: first, pointsAgainst: second };
}

function resultOf(clause: string): ParsedRola["result"] {
  const text = normalizeText(clause);
  if (/\b(empatei|empate)\b/.test(text)) return "empate";
  if (/\b(perdi|derrota)\b/.test(text)) return "derrota";
  if (/\b(sem finalizar|nao finalizei|não finalizei)\b/.test(clause) || /\bsem finalizar\b/.test(text)) return "sem_resultado";
  if (/\b(levei|sofri|tomei)\b/.test(text) && findTechniqueHits(clause).some((hit) => hit.category === "finalizacao")) {
    return "derrota";
  }
  if (/\b(finalizei|fechei|venci|ganhei|vitoria|vitória)\b/.test(text)) return "vitoria";
  return "sem_resultado";
}

function clauseToRola(clause: string, duration: number): ParsedRola | null {
  const hits = findTechniqueHits(clause);
  const partners = partnerCandidates(clause);
  const result = resultOf(clause);
  const hasSignal = partners.length > 0 || hits.length > 0 || result !== "sem_resultado" || /(\d+)\s*(?:a|x|×)\s*(\d+)/i.test(clause);
  if (!hasSignal) return null;
  const opponentDidIt = /\b(ela|ele)\s+passou\b/i.test(clause);
  const suffered = result === "derrota" && /\b(levei|sofri|tomei|me pegou)\b/i.test(clause);
  const finishedByMe = result === "vitoria";
  const submissions = unique(hits.filter((hit) => hit.category === "finalizacao").map((hit) => hit.id));
  const positions = unique(hits.filter((hit) => hit.category !== "finalizacao").map((hit) => hit.id));
  const myPositions = opponentDidIt ? positions.filter((id) => {
    const hit = hits.find((item) => item.id === id);
    return hit?.category !== "passagem";
  }) : positions;
  return {
    durationMinutes: duration,
    partnerName: partners[0] ?? "",
    result,
    ...scoreOf(clause, result),
    advantagesFor: 0,
    advantagesAgainst: 0,
    penaltiesFor: 0,
    penaltiesAgainst: 0,
    submissionsApplied: finishedByMe ? submissions : [],
    submissionsSuffered: suffered ? submissions : [],
    techniquesUsed: finishedByMe || suffered ? myPositions : unique([...myPositions, ...submissions]),
  };
}

export function normalizeReport(text: string): ParsedSession {
  const modality = /no[-\s]?gi|sem kimono/i.test(text) ? "nogi" : /\bkimono\b/i.test(text) ? "gi" : null;
  const durationMatch = text.match(/(\d{1,2})\s*min/i);
  const duration = durationMatch ? Number(durationMatch[1]) : 6;
  const countMatch = text.match(/(\d{1,2})\s*rolas/i);
  const count = countMatch ? Number(countMatch[1]) : 0;
  const clauses = text.split(/[.!?;\n]+/).map((item) => item.trim()).filter(Boolean);
  const rolas = clauses
    .map((clause) => clauseToRola(clause, duration))
    .filter((rola): rola is ParsedRola => rola !== null);
  while (rolas.length < count) {
    rolas.push({
      durationMinutes: duration,
      partnerName: "",
      result: "sem_resultado",
      pointsFor: 0,
      pointsAgainst: 0,
      advantagesFor: 0,
      advantagesAgainst: 0,
      penaltiesFor: 0,
      penaltiesAgainst: 0,
      submissionsApplied: [],
      submissionsSuffered: [],
      techniquesUsed: [],
    });
  }
  return { modality, rolas };
}

export function canonicalizeNames(names: string[] | undefined): string[] {
  const ids: string[] = [];
  for (const name of names ?? []) {
    const match = matchTechnique(name);
    if (match && !ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}
