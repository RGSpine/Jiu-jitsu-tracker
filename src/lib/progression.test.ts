import { describe, expect, it } from "vitest";
import { buildProgress, dayXp, diffProgress, levelFromXp, PROGRESSION, rankFor, type ProgressRola } from "@/lib/progression";
import { buildPersonalSample, DEMO_ROBERTO_ID } from "@/lib/sample-data";

function rola(partial: Partial<ProgressRola> & { id?: string } = {}): ProgressRola {
  return {
    occurredOn: "2026-11-02",
    modality: "nogi",
    durationMinutes: 6,
    sessionId: partial.sessionId ?? "s1",
    pointsFor: 0,
    submissionsApplied: [],
    submissionsSuffered: [],
    techniquesUsed: [],
    ...partial,
  };
}

describe("progressão", () => {
  it("limita o XP do dia mesmo com dezenas de rolas longos", () => {
    const many = Array.from({ length: 30 }, () => rola({
      sessionId: "s1",
      durationMinutes: 60,
      occurredOn: "2026-11-02",
      pointsFor: 10,
      submissionsApplied: [{ id: "triangulo" }],
    }));
    const view = buildProgress(many, "2026-11-02");
    expect(view.xp).toBeLessThanOrEqual(PROGRESSION.dailyCap + PROGRESSION.questWeekCap + 50);
    expect(view.xp).toBeGreaterThan(0);
  });

  it("ignora heel hook no kimono", () => {
    const view = buildProgress([
      rola({ modality: "gi", submissionsApplied: [{ id: "heel-hook" }], techniquesUsed: [{ id: "heel-hook", category: "finalizacao" }] }),
    ], "2026-11-02");
    const feet = view.attributes.find((item) => item.id === "pes");
    expect(feet?.level).toBe(0);
    expect(view.skills.find((item) => item.id === "finalizador-pe")?.unlocked).toBe(false);
  });

  it("não libera evolução com amostra pequena", () => {
    const previous = Array.from({ length: 2 }, (_, index) => rola({
      occurredOn: "2026-10-05",
      sessionId: `p${index}`,
      techniquesUsed: [{ id: "passagem-de-joelho", category: "passagem" }],
    }));
    const current = Array.from({ length: 6 }, (_, index) => rola({
      occurredOn: "2026-11-05",
      sessionId: `c${index}`,
      techniquesUsed: [{ id: "passagem-de-joelho", category: "passagem" }],
    }));
    const view = buildProgress([...previous, ...current], "2026-11-11");
    expect(view.skills.find((item) => item.id === "passador")?.unlocked).toBe(false);
  });

  it("libera título quando a taxa sobe de verdade", () => {
    const previous = Array.from({ length: 8 }, (_, index) => rola({
      occurredOn: `2026-10-${String(index + 1).padStart(2, "0")}`,
      sessionId: `p${index}`,
      modality: "nogi",
      submissionsApplied: index < 2 ? [{ id: "chave-de-tornozelo" }] : [],
    }));
    const current = Array.from({ length: 8 }, (_, index) => rola({
      occurredOn: `2026-11-${String(index + 1).padStart(2, "0")}`,
      sessionId: `c${index}`,
      modality: "nogi",
      submissionsApplied: index < 4 ? [{ id: "heel-hook" }] : [],
    }));
    const view = buildProgress([...previous, ...current], "2026-11-11");
    expect(view.skills.find((item) => item.id === "finalizador-pe")?.unlocked).toBe(true);
    expect(view.titles.some((item) => item.title === "Finalizador de pé")).toBe(true);
  });

  it("sobe de nível só com XP acumulado e separa a faixa real do posto", () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(179).level).toBe(1);
    expect(levelFromXp(180).level).toBe(2);
    expect(rankFor(1)).toBe("Centelha");
    expect(rankFor(12)).toBe("Aço");
    expect(["branca", "azul", "roxa", "marrom", "preta"]).not.toContain(rankFor(20));
  });

  it("anuncia só o que mudou depois de salvar", () => {
    const before = buildProgress([rola()], "2026-11-02");
    const after = buildProgress([
      rola(),
      rola({ occurredOn: "2026-11-03", sessionId: "s2", submissionsApplied: [{ id: "triangulo" }] }),
    ], "2026-11-03");
    const events = diffProgress(before, after);
    expect(events.some((event) => event.kind === "habilidade" && event.title === "Triângulo")).toBe(true);
  });

  it("o histórico de exemplo abre habilidades e um posto intermediário", () => {
    const sample = buildPersonalSample({
      userId: DEMO_ROBERTO_ID,
      userName: "Roberto Almeida",
      today: "2026-11-11",
    });
    const view = buildProgress(sample.rolas.map((rola) => ({
      occurredOn: rola.occurredOn,
      modality: rola.modality,
      durationMinutes: rola.durationMinutes,
      sessionId: rola.sessionId,
      pointsFor: rola.pointsAthlete,
      submissionsApplied: rola.actions.filter((action) => action.performer === "self" && action.actionType === "finalizacao").map((action) => ({ id: action.techniqueId })),
      submissionsSuffered: rola.actions.filter((action) => action.performer === "partner" && action.actionType === "finalizacao").map((action) => ({ id: action.techniqueId })),
      techniquesUsed: rola.actions.filter((action) => action.performer === "self" && action.actionType === "tecnica").map((action) => ({ id: action.techniqueId })),
    })), "2026-11-11");
    expect(view.level).toBeGreaterThan(8);
    expect(view.level).toBeLessThan(24);
    expect(view.skills.filter((skill) => skill.unlocked).length).toBeGreaterThan(2);
    expect(view.quests.length).toBeGreaterThan(0);
  });

  it("mostra a missão de treinar três vezes", () => {
    const view = buildProgress([
      rola({ occurredOn: "2026-11-09", sessionId: "a" }),
      rola({ occurredOn: "2026-11-10", sessionId: "b" }),
    ], "2026-11-11");
    const quest = view.quests.find((item) => item.id.includes("treinar"));
    expect(quest?.goal).toBe(3);
    expect(quest?.current).toBe(2);
    expect(quest?.done).toBe(false);
    expect(quest?.text).toMatch(/3/);
  });
});

describe("teto do dia", () => {
  it("não passa do teto mesmo com ritmo", () => {
    const xp = dayXp({
      date: "2026-11-02",
      minutes: 500,
      rolas: 40,
      sessions: new Set(["s"]),
      subs: 20,
      suffered: 0,
      points: 80,
      families: { quedas: 0, passagem: 0, guarda: 0, costas: 0, pes: 0, pescoco: 0, bracos: 0, defesa: 0, presenca: 0 },
    }, 99);
    expect(xp).toBe(PROGRESSION.dailyCap);
  });
});
