import type { ScoringRule, Technique } from "@/lib/types";

export function suggestPoints(
  techniqueIds: string[],
  catalog: Technique[],
  rules: ScoringRule[],
): number {
  const pointsByCode = new Map(rules.map((rule) => [rule.code, rule.points]));
  const byId = new Map(catalog.map((item) => [item.id, item]));
  let total = 0;
  for (const id of techniqueIds) {
    const technique = byId.get(id);
    if (!technique?.scoringCode) continue;
    total += pointsByCode.get(technique.scoringCode) ?? 0;
  }
  return total;
}
