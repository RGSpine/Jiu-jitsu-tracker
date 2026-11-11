import { describe, expect, it } from "vitest";
import { techniques } from "@/data/catalog";
import { rulesFor } from "@/data/rules";
import { demoPerspectives, createSeed } from "@/lib/demo-db";
import { draftFromParsed } from "@/lib/parse-draft";
import { invertResult, toPerspective } from "@/lib/perspective";
import { matchTechnique } from "@/lib/match-technique";
import { suggestPoints } from "@/lib/scoring";
import { buildIncomingFromPartner, buildPersonalSample, DEMO_ANA_ID, DEMO_ROBERTO_ID } from "@/lib/sample-data";
import { emptyDraft } from "@/lib/drafts";
import { percentChange, periodWindow, summarize } from "@/lib/stats";

describe("pontuação IBJJF", () => {
  it("soma queda, passagem e montada", () => {
    const rules = rulesFor("ibjjf");
    expect(suggestPoints(["single-leg", "passagem-de-joelho", "montada"], techniques, rules)).toBe(2 + 3 + 4);
    expect(suggestPoints(["guarda-puxada", "reguarda"], techniques, rules)).toBe(0);
  });
});

describe("catálogo", () => {
  it("reconhece apelidos usados no tatame", () => {
    expect(matchTechnique("triângulo", techniques)?.id).toBe("triangulo");
    expect(matchTechnique("chave de braço", techniques)?.id).toBe("armlock");
    expect(matchTechnique("heel hook", techniques)?.id).toBe("heel-hook");
    expect(matchTechnique("mata leao", techniques)?.id).toBe("mata-leao");
    expect(matchTechnique("voo do morcego", techniques)).toBeNull();
  });

  it("não repete slug", () => {
    const ids = techniques.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("perspectiva da rola", () => {
  it("inverte resultado, pontos e finalizações", () => {
    const stored = buildIncomingFromPartner("2026-11-11").rolas[0]!;
    const roberto = toPerspective(stored, DEMO_ROBERTO_ID, techniques);
    const ana = toPerspective(stored, DEMO_ANA_ID, techniques);
    expect(ana?.ownedByMe).toBe(true);
    expect(ana?.result).toBe("vitoria");
    expect(ana?.submissionsApplied.map((item) => item.id)).toEqual(["heel-hook"]);
    expect(roberto?.ownedByMe).toBe(false);
    expect(roberto?.result).toBe("derrota");
    expect(roberto?.pointsFor).toBe(stored.pointsPartner);
    expect(roberto?.pointsAgainst).toBe(stored.pointsAthlete);
    expect(roberto?.submissionsSuffered.map((item) => item.id)).toEqual(["heel-hook"]);
    expect(invertResult("empate")).toBe("empate");
  });
});

describe("estatísticas", () => {
  it("calcula taxa de vitória e finalização", () => {
    const summary = summarize([
      fake("vitoria", ["triangulo"], []),
      fake("derrota", [], ["armlock"]),
      fake("empate", [], []),
      fake("sem_resultado", [], []),
    ]);
    expect(summary.rolas).toBe(4);
    expect(summary.winRate).toBeCloseTo(1 / 3);
    expect(summary.submissionsPerRola).toBeCloseTo(0.25);
    expect(summary.finishRate).toBeCloseTo(0.25);
    expect(summary.submissionsSuffered).toBe(1);
    expect(percentChange(0.5, 0)).toBeNull();
    expect(percentChange(6, 4)).toBe(50);
  });

  it("abre a semana na segunda", () => {
    const week = periodWindow("semana", "2026-11-11");
    expect(week.start).toBe("2026-11-09");
    expect(week.end).toBe("2026-11-15");
    expect(periodWindow("semestre", "2026-11-11").start).toBe("2026-07-01");
  });
});

describe("dados de exemplo", () => {
  it("monta um histórico coerente até hoje", () => {
    const today = "2026-11-11";
    const sample = buildPersonalSample({
      userId: DEMO_ROBERTO_ID,
      userName: "Roberto Almeida",
      today,
      linkedPartner: { id: DEMO_ANA_ID, name: "Ana Souza" },
    });
    expect(sample.sessions.length).toBeGreaterThan(10);
    expect(sample.rolas.every((rola) => rola.occurredOn <= today)).toBe(true);
    expect(sample.rolas.every((rola) => techniques.some((item) => rola.actions.every((action) => item.id === action.techniqueId || techniques.some((tech) => tech.id === action.techniqueId))))).toBe(true);
    const db = createSeed(today);
    db.currentUserId = DEMO_ROBERTO_ID;
    const views = demoPerspectives(db);
    expect(views.some((rola) => !rola.ownedByMe && rola.submissionsSuffered.some((item) => item.id === "heel-hook"))).toBe(true);
  });
});

describe("leitura do relato", () => {
  it("encaixa os nomes do catálogo e avisa o que não achou", () => {
    const result = draftFromParsed(
      {
        modality: "nogi",
        rolas: [
          {
            partnerName: "João",
            result: "vitoria",
            durationMinutes: 6,
            submissionsApplied: ["triângulo"],
            techniquesUsed: ["passagem toreando", "voo do morcego"],
          },
        ],
      },
      techniques,
      emptyDraft("2026-11-11", "gi"),
      () => "rola-1",
    );
    expect(result.draft.modality).toBe("nogi");
    expect(result.draft.rolas[0]?.submissionsApplied).toEqual(["triangulo"]);
    expect(result.draft.rolas[0]?.techniquesUsed).toEqual(["passagem-toreando"]);
    expect(result.warnings.some((warning) => warning.includes("voo do morcego"))).toBe(true);
  });
});

function fake(result: "vitoria" | "derrota" | "empate" | "sem_resultado", applied: string[], suffered: string[]) {
  return {
    id: result + applied.join(),
    sessionId: "s",
    occurredOn: "2026-11-01",
    modality: "nogi" as const,
    federationId: "ibjjf",
    durationMinutes: 6,
    ownedByMe: true,
    athleteName: "Roberto",
    opponentName: "João",
    opponentUserId: null,
    result,
    pointsFor: 0,
    pointsAgainst: 0,
    advantagesFor: 0,
    advantagesAgainst: 0,
    penaltiesFor: 0,
    penaltiesAgainst: 0,
    submissionsApplied: applied.map((id) => ({ id, name: id, category: "finalizacao" as const })),
    submissionsSuffered: suffered.map((id) => ({ id, name: id, category: "finalizacao" as const })),
    techniquesUsed: [],
  };
}
