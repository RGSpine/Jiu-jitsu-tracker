import { describe, expect, it } from "vitest";
import { acceptRephrases, buildInsights, factsHold } from "@/lib/insights";
import { compareMetric, compareSnapshots, evolutionPoints, MIN_BASELINE, snapshot } from "@/lib/metrics";
import type { PerspectiveRola } from "@/lib/types";

function rola(partial: Partial<PerspectiveRola> & { id: string }): PerspectiveRola {
  return {
    sessionId: partial.sessionId ?? `s-${partial.id}`,
    occurredOn: "2026-11-02",
    modality: "nogi",
    federationId: "ibjjf",
    durationMinutes: 6,
    ownedByMe: true,
    athleteName: "Roberto",
    opponentName: "João",
    opponentUserId: null,
    result: "vitoria",
    pointsFor: 2,
    pointsAgainst: 0,
    advantagesFor: 0,
    advantagesAgainst: 0,
    penaltiesFor: 0,
    penaltiesAgainst: 0,
    submissionsApplied: [],
    submissionsSuffered: [],
    techniquesUsed: [],
    ...partial,
  };
}

describe("métricas", () => {
  it("separa contagem, tempo de tatame e taxas por rola e por hora", () => {
    const view = snapshot([
      rola({
        id: "1",
        durationMinutes: 6,
        submissionsApplied: [{ id: "triangulo", name: "Triângulo", category: "finalizacao" }],
        techniquesUsed: [
          { id: "passagem-de-joelho", name: "Passagem de joelho", category: "passagem" },
          { id: "montada", name: "Montada", category: "controle" },
        ],
        pointsFor: 4,
        pointsAgainst: 2,
      }),
      rola({
        id: "2",
        sessionId: "s-1",
        result: "derrota",
        durationMinutes: 6,
        submissionsSuffered: [{ id: "heel-hook", name: "Heel hook", category: "finalizacao" }],
        techniquesUsed: [{ id: "saida-de-montada", name: "Saída de montada", category: "escape" }],
        pointsFor: 0,
        pointsAgainst: 2,
      }),
    ]);
    expect(view.rolas).toBe(2);
    expect(view.trainings).toBe(1);
    expect(view.matMinutes).toBe(12);
    expect(view.avgRolaMinutes).toBe(6);
    expect(view.submissionsApplied).toBe(1);
    expect(view.submissionsSuffered).toBe(1);
    expect(view.subsAppliedPerRola).toBeCloseTo(0.5);
    expect(view.subsAppliedPerHour).toBeCloseTo(5);
    expect(view.passagens).toBe(1);
    expect(view.posicoes).toBe(1);
    expect(view.escapes).toBe(1);
    expect(view.finalizacoes).toBe(1);
    expect(view.pointsFor).toBe(4);
    expect(view.pointsAgainst).toBe(4);
    expect(view.winRate).toBeCloseTo(0.5);
  });

  it("não transforma 1 para 4 em +300%", () => {
    const delta = compareMetric(4, 1, true, 12);
    expect(delta.pct).toBeNull();
    expect(delta.status).toBe("low");
    expect(MIN_BASELINE).toBeGreaterThan(1);
  });

  it("mostra novo quando a base é zero e percentual quando a amostra basta", () => {
    expect(compareMetric(3, 0, true, 10).status).toBe("new");
    const delta = compareMetric(8, 4, true, 10);
    expect(delta.pct).toBe(100);
    expect(delta.status).toBe("up");
    expect(delta.good).toBe(true);
    const worse = compareMetric(8, 4, false, 10);
    expect(worse.good).toBe(false);
  });

  it("abre o mês em semanas com treinos e finalizações separados", () => {
    const points = evolutionPoints("mes", [
      rola({ id: "a", occurredOn: "2026-11-02", submissionsApplied: [{ id: "triangulo", name: "Triângulo", category: "finalizacao" }] }),
      rola({ id: "b", occurredOn: "2026-11-03", sessionId: "s-b" }),
      rola({ id: "c", occurredOn: "2026-11-10", sessionId: "s-c", result: "derrota", pointsAgainst: 4 }),
    ], "2026-11-11");
    expect(points.map((point) => point.label)).toEqual(["1", "8"]);
    expect(points.some((point) => point.rolas === 2 && point.trainings === 2)).toBe(true);
    expect(points.reduce((sum, point) => sum + point.submissionsApplied, 0)).toBe(1);
    expect(points.reduce((sum, point) => sum + point.losses, 0)).toBe(1);
  });
});

describe("frases", () => {
  it("usa só números do motor e recusa frase que inventa outro número", () => {
    const current = snapshot(Array.from({ length: 8 }, (_, index) => rola({
      id: `c${index}`,
      sessionId: `sc${index}`,
      submissionsApplied: [{ id: "triangulo", name: "Triângulo", category: "finalizacao" }],
      techniquesUsed: [{ id: "passagem-de-joelho", name: "Passagem", category: "passagem" }],
    })));
    const previous = snapshot(Array.from({ length: 8 }, (_, index) => rola({
      id: `p${index}`,
      sessionId: `sp${index}`,
      result: "derrota",
      submissionsApplied: [],
      submissionsSuffered: [{ id: "heel-hook", name: "Heel hook", category: "finalizacao" }],
      techniquesUsed: [],
    })));
    const metrics = compareSnapshots(current, previous);
    const insights = buildInsights(metrics, "mes", current, 2);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0]?.text).toMatch(/\d+%|\d+x/);
    for (const insight of insights) {
      expect(factsHold(insight.text, insight.numbers)).toBe(true);
    }
    const rewritten = acceptRephrases(insights, insights.map((item) => `${item.text} e mais 999.`));
    expect(rewritten.map((item) => item.text)).toEqual(insights.map((item) => item.text));
  });
});
