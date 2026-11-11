import type { Federation, ScoringRule } from "@/lib/types";

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
