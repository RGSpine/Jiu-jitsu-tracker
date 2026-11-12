import type { AgeDivision, Belt, Category, MatchMethod, MatchStage, Modality, Organization, Placement, Result } from "@/lib/types";

export const BELT_OPTIONS: { id: Belt; label: string }[] = [
  { id: "branca", label: "Branca" },
  { id: "azul", label: "Azul" },
  { id: "roxa", label: "Roxa" },
  { id: "marrom", label: "Marrom" },
  { id: "preta", label: "Preta" },
  { id: "coral", label: "Coral" },
  { id: "vermelha", label: "Vermelha" },
];

export const CATEGORY_OPTIONS: { id: Category; label: string }[] = [
  { id: "queda", label: "Quedas" },
  { id: "raspagem", label: "Raspagens" },
  { id: "passagem", label: "Passagens" },
  { id: "finalizacao", label: "Finalizações" },
  { id: "controle", label: "Controles" },
  { id: "escape", label: "Saídas" },
];

export const RESULT_OPTIONS: { id: Result; label: string }[] = [
  { id: "vitoria", label: "Vitória" },
  { id: "derrota", label: "Derrota" },
  { id: "empate", label: "Empate" },
  { id: "sem_resultado", label: "Sem resultado" },
];

export function beltLabel(belt: Belt | null): string {
  if (!belt) return "Sem faixa";
  return BELT_OPTIONS.find((item) => item.id === belt)?.label ?? belt;
}

export function modalityLabel(modality: Modality): string {
  return modality === "gi" ? "Kimono" : "No-gi";
}

export function resultLabel(result: Result): string {
  return RESULT_OPTIONS.find((item) => item.id === result)?.label ?? result;
}

export const ORG_OPTIONS: { id: Organization; label: string }[] = [
  { id: "ibjjf", label: "IBJJF" },
  { id: "cbjj", label: "CBJJ" },
  { id: "adcc", label: "ADCC" },
  { id: "ajp", label: "AJP" },
  { id: "outro", label: "Outra" },
];

export const PLACEMENT_OPTIONS: { id: Placement; label: string }[] = [
  { id: "ouro", label: "Ouro" },
  { id: "prata", label: "Prata" },
  { id: "bronze", label: "Bronze" },
  { id: "participacao", label: "Participação" },
];

export const STAGE_OPTIONS: { id: MatchStage; label: string }[] = [
  { id: "oitavas", label: "Oitavas" },
  { id: "quartas", label: "Quartas" },
  { id: "semi", label: "Semi" },
  { id: "final", label: "Final" },
  { id: "absoluto", label: "Absoluto" },
  { id: "outro", label: "Outra" },
];

export const METHOD_OPTIONS: { id: MatchMethod; label: string }[] = [
  { id: "finalizacao", label: "Finalização" },
  { id: "pontos", label: "Pontos" },
  { id: "vantagens", label: "Vantagens" },
  { id: "punicao", label: "Punição" },
  { id: "decisao", label: "Decisão" },
  { id: "dq", label: "DQ" },
  { id: "wo", label: "WO" },
];

export function orgLabel(id: Organization): string {
  return ORG_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

export function placementLabel(id: Placement | null): string {
  if (!id) return "—";
  return PLACEMENT_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

export function stageLabel(id: MatchStage): string {
  return STAGE_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

export function methodLabel(id: MatchMethod): string {
  return METHOD_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

export function ageLabel(id: AgeDivision): string {
  if (id === "juvenil") return "Juvenil";
  if (id === "master") return "Master";
  return "Adulto";
}

export function categoryLabel(category: Category): string {
  return CATEGORY_OPTIONS.find((item) => item.id === category)?.label ?? category;
}
