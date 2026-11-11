import { matchTechnique } from "@/lib/match-technique";
import type { Modality, Result, RolaDraft, SessionDraft, Technique } from "@/lib/types";

export type ParsedRola = {
  durationMinutes?: number;
  partnerName?: string;
  result?: Result;
  pointsFor?: number;
  pointsAgainst?: number;
  advantagesFor?: number;
  advantagesAgainst?: number;
  penaltiesFor?: number;
  penaltiesAgainst?: number;
  submissionsApplied?: string[];
  submissionsSuffered?: string[];
  techniquesUsed?: string[];
};

export type ParsedSession = {
  date?: string | null;
  modality?: Modality | null;
  notes?: string;
  rolas?: ParsedRola[];
};

const RESULTS = new Set<Result>(["vitoria", "derrota", "empate", "sem_resultado"]);

function asInt(value: unknown, fallback: number, max: number): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(0, Math.round(number)));
}

function mapNames(names: string[] | undefined, catalog: Technique[], warnings: string[]): string[] {
  const ids: string[] = [];
  for (const name of names ?? []) {
    const match = matchTechnique(name, catalog);
    if (!match) {
      warnings.push(`Não reconheci a técnica “${name}”.`);
      continue;
    }
    ids.push(match.id);
  }
  return ids;
}

export function draftFromParsed(
  parsed: ParsedSession,
  catalog: Technique[],
  current: SessionDraft,
  makeId: () => string,
): { draft: SessionDraft; warnings: string[] } {
  const warnings: string[] = [];
  const rolas = parsed.rolas ?? [];
  if (rolas.length === 0) warnings.push("Não encontrei rolas nesse relato.");

  const nextRolas: RolaDraft[] = rolas.map((rola) => {
    const result = rola.result && RESULTS.has(rola.result) ? rola.result : "sem_resultado";
    if (!rola.partnerName?.trim()) warnings.push("Um rola ficou sem o nome do parceiro.");
    return {
      localId: makeId(),
      durationMinutes: Math.min(90, Math.max(1, asInt(rola.durationMinutes, 6, 90) || 6)),
      partnerUserId: null,
      partnerName: (rola.partnerName ?? "").trim(),
      result,
      pointsFor: asInt(rola.pointsFor, 0, 100),
      pointsAgainst: asInt(rola.pointsAgainst, 0, 100),
      advantagesFor: asInt(rola.advantagesFor, 0, 20),
      advantagesAgainst: asInt(rola.advantagesAgainst, 0, 20),
      penaltiesFor: asInt(rola.penaltiesFor, 0, 20),
      penaltiesAgainst: asInt(rola.penaltiesAgainst, 0, 20),
      submissionsApplied: mapNames(rola.submissionsApplied, catalog, warnings),
      submissionsSuffered: mapNames(rola.submissionsSuffered, catalog, warnings),
      techniquesUsed: mapNames(rola.techniquesUsed, catalog, warnings),
    };
  });

  const date = parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : current.date;
  const modality = parsed.modality === "gi" || parsed.modality === "nogi" ? parsed.modality : current.modality;

  return {
    draft: {
      ...current,
      date,
      modality,
      notes: parsed.notes?.trim() ? parsed.notes.trim() : current.notes,
      rolas: nextRolas,
    },
    warnings,
  };
}
