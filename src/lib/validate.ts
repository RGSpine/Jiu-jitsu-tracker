import type { SessionDraft } from "@/lib/types";

export function validateDraft(draft: SessionDraft): string[] {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) errors.push("Informe a data do treino.");
  if (draft.rolas.length === 0) errors.push("Adicione pelo menos uma rola.");
  if (draft.rolas.length > 30) errors.push("Um treino pode ter no máximo 30 rolas.");
  draft.rolas.forEach((rola, index) => {
    const label = `Rola ${index + 1}`;
    if (!rola.partnerName.trim()) errors.push(`${label}: informe o parceiro.`);
    if (rola.durationMinutes < 1 || rola.durationMinutes > 90) {
      errors.push(`${label}: a duração precisa ficar entre 1 e 90 minutos.`);
    }
  });
  return errors;
}
