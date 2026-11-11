import { describe, expect, it } from "vitest";
import { glossary, GLOSSARY_VERSION } from "@/data/glossary";
import { techniques } from "@/data/catalog";
import { matchTechnique, sttVocabularyPrompt } from "@/lib/glossary-match";
import { normalizeReport } from "@/lib/normalize-report";

describe("glossário", () => {
  it("cobre o catálogo inteiro e tem versão", () => {
    expect(GLOSSARY_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    const ids = techniques.map((item) => item.id).sort();
    const glossaryIds = glossary.map((item) => item.id).sort();
    expect(glossaryIds).toEqual(ids);
    expect(new Set(glossaryIds).size).toBe(glossaryIds.length);
  });

  it("reconhece apelidos e erros de transcrição", () => {
    expect(matchTechnique("hell hook")?.id).toBe("heel-hook");
    expect(matchTechnique("machado de calcanhar")?.id).toBe("heel-hook");
    expect(matchTechnique("cross ash")?.id).toBe("cross-ashi");
    expect(matchTechnique("juji-gatame")?.id).toBe("armlock");
    expect(matchTechnique("sankaku")?.id).toBe("triangulo");
    expect(matchTechnique("triângulo de mão")?.id).toBe("katagatame");
    expect(matchTechnique("botinha")?.id).toBe("chave-de-tornozelo");
    expect(matchTechnique("hadaka-jime")?.id).toBe("mata-leao");
    expect(matchTechnique("ude garami")?.id).toBe("kimura");
    expect(matchTechnique("false grip")?.id).toBe("false-grip");
  });

  it("manda um vocabulário curto para a transcrição", () => {
    const prompt = sttVocabularyPrompt();
    expect(prompt.length).toBeLessThanOrEqual(900);
    expect(prompt).toContain("hell hook");
    expect(prompt).toContain("cross ash");
  });
});

describe("leitura determinística", () => {
  it("lê um relato misturando gíria, placar e contagem", () => {
    const report = normalizeReport(
      "Fiz 5 rolas de 6 min no no-gi. Finalizei o João no sankaku. Perdi pra Maria por 4 a 2, ela passou de joelho.",
    );
    expect(report.modality).toBe("nogi");
    expect(report.rolas).toHaveLength(5);
    expect(report.rolas?.every((rola) => rola.durationMinutes === 6)).toBe(true);
    const joao = report.rolas?.find((rola) => rola.partnerName === "João");
    const maria = report.rolas?.find((rola) => rola.partnerName === "Maria");
    expect(joao?.result).toBe("vitoria");
    expect(joao?.submissionsApplied).toEqual(["triangulo"]);
    expect(maria?.result).toBe("derrota");
    expect(maria?.pointsFor).toBe(2);
    expect(maria?.pointsAgainst).toBe(4);
    expect(maria?.techniquesUsed ?? []).not.toContain("passagem-de-joelho");
  });

  it("normaliza hell hook e cross ash no mesmo rola", () => {
    const report = normalizeReport("Fechei um hell hook e entrei de cross ash no Lucas.");
    expect(report.rolas).toHaveLength(1);
    expect(report.rolas?.[0]?.partnerName).toBe("Lucas");
    expect(report.rolas?.[0]?.result).toBe("vitoria");
    expect(report.rolas?.[0]?.submissionsApplied).toEqual(["heel-hook"]);
    expect(report.rolas?.[0]?.techniquesUsed).toContain("cross-ashi");
  });

  it("trata botinha em empate como técnica, não como finalização fechada", () => {
    const report = normalizeReport("Empatei com a Ana na botinha.");
    expect(report.rolas?.[0]?.partnerName).toBe("Ana");
    expect(report.rolas?.[0]?.result).toBe("empate");
    expect(report.rolas?.[0]?.submissionsApplied).toEqual([]);
    expect(report.rolas?.[0]?.techniquesUsed).toContain("chave-de-tornozelo");
  });

  it("separa passagem de finalização e não confunde triângulo de mão com triângulo", () => {
    const passes = normalizeReport("Passei toreando e de knee slice no Diego, sem finalizar.");
    expect(passes.rolas?.[0]?.partnerName).toBe("Diego");
    expect(passes.rolas?.[0]?.result).toBe("sem_resultado");
    expect(passes.rolas?.[0]?.techniquesUsed).toEqual(expect.arrayContaining(["passagem-toreando", "passagem-de-joelho"]));
    expect(passes.rolas?.[0]?.submissionsApplied).toEqual([]);

    const armTriangle = normalizeReport("Triângulo de mão no Pedro, kata-gatame.");
    expect(armTriangle.rolas?.[0]?.partnerName).toBe("Pedro");
    expect(armTriangle.rolas?.[0]?.techniquesUsed).toEqual(["katagatame"]);
    expect(armTriangle.rolas?.[0]?.techniquesUsed).not.toContain("triangulo");
  });

  it("reconhece quedas japonesas e finalização sofrida sem duplicar", () => {
    const takedowns = normalizeReport("Derrubei o Bruno de o-soto-gari e uchi mata.");
    expect(takedowns.rolas?.[0]?.partnerName).toBe("Bruno");
    expect(takedowns.rolas?.[0]?.techniquesUsed).toEqual(expect.arrayContaining(["o-soto-gari", "uchi-mata"]));

    const back = normalizeReport("Levei um mata-leão, hadaka jime.");
    expect(back.rolas?.[0]?.result).toBe("derrota");
    expect(back.rolas?.[0]?.submissionsSuffered).toEqual(["mata-leao"]);
  });
});
