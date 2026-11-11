import type { Technique } from "@/lib/types";

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchTechnique(name: string, catalog: Technique[]): Technique | null {
  const needle = normalizeText(name);
  if (!needle) return null;

  const exact = catalog.find((item) => {
    const candidates = [item.name, item.id, ...item.aliases];
    return candidates.some((candidate) => normalizeText(candidate) === needle);
  });
  if (exact) return exact;

  const partial = catalog.find((item) => {
    const candidates = [item.name, ...item.aliases].map(normalizeText);
    return candidates.some(
      (candidate) =>
        candidate.length >= 4 && (needle.includes(candidate) || candidate.includes(needle)),
    );
  });
  return partial ?? null;
}
