import type { AgeDivision, Belt, Federation, ScoringRule } from "@/lib/types";

export const federations: Federation[] = [
  { id: "ibjjf", name: "IBJJF", isDefault: true },
];

export const scoringRules: ScoringRule[] = [
  { federationId: "ibjjf", code: "takedown", label: "Queda", points: 2 },
  { federationId: "ibjjf", code: "sweep", label: "Raspagem", points: 2 },
  { federationId: "ibjjf", code: "knee_on_belly", label: "Joelho na barriga", points: 2 },
  { federationId: "ibjjf", code: "guard_pass", label: "Passagem de guarda", points: 3 },
  { federationId: "ibjjf", code: "mount", label: "Montada", points: 4 },
  { federationId: "ibjjf", code: "back_control", label: "Pegada nas costas", points: 4 },
];

export function defaultFederation(): Federation {
  return federations.find((item) => item.isDefault) ?? federations[0];
}

export function rulesFor(federationId: string): ScoringRule[] {
  return scoringRules.filter((rule) => rule.federationId === federationId);
}

const ADULT_MINUTES: Record<Belt, number> = {
  branca: 5,
  azul: 6,
  roxa: 7,
  marrom: 8,
  preta: 10,
  coral: 10,
  vermelha: 10,
};

/** Tempo oficial de luta IBJJF, em minutos, para a faixa e a idade. */
export function ibjjfMatchMinutes(belt: Belt | null, age: AgeDivision = "adulto"): number {
  if (age === "master") return 5;
  if (age === "juvenil") return belt === "branca" || belt === "azul" || !belt ? 4 : 5;
  return ADULT_MINUTES[belt ?? "branca"];
}
