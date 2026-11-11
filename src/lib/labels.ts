import type { Belt, Category, Modality, Result } from "@/lib/types";

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

export function categoryLabel(category: Category): string {
  return CATEGORY_OPTIONS.find((item) => item.id === category)?.label ?? category;
}
