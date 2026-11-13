import { describe, expect, it } from "vitest";
import {
  assessCampaign,
  campaignMessages,
  campaignPhase,
  competitionBonusXp,
  competitionHonors,
  competitionReport,
  readinessIndex,
  rowXp,
  weightScore,
  type CompetitionXpRow,
} from "@/lib/competition";
import { groundCompetition, numberIsInText, parseCompetitionText } from "@/lib/competition-parse";
import { MIN_BASELINE } from "@/lib/metrics";
import type { Competition, CompetitionMatch } from "@/lib/types";

function comp(patch: Partial<Competition> & Pick<Competition, "id" | "date">): Competition {
  return {
    userId: "u",
    name: patch.id,
    organization: "ibjjf",
    city: "",
    modality: "gi",
    belt: "roxa",
    ageDivision: "adulto",
    weightClass: "medio",
    absolute: false,
    absolutePlacement: null,
    status: "done",
    placement: null,
    notes: "",
    ...patch,
  };
}

function match(patch: Partial<CompetitionMatch> & Pick<CompetitionMatch, "id" | "competitionId" | "result">): CompetitionMatch {
  return {
    order: 1,
    stage: "final",
    opponentName: "Alguém",
    method: "pontos",
    techniqueId: null,
    pointsFor: 2,
    pointsAgainst: 0,
    advantagesFor: 0,
    advantagesAgainst: 0,
    penaltiesFor: 0,
    penaltiesAgainst: 0,
    durationSeconds: 300,
    notes: "",
    ...patch,
  };
}

describe("fases da campanha", () => {
  it("corta o calendário nos dias combinados", () => {
    expect(campaignPhase(57)).toBe("base");
    expect(campaignPhase(56)).toBe("especifico");
    expect(campaignPhase(21)).toBe("especifico");
    expect(campaignPhase(20)).toBe("polimento");
    expect(campaignPhase(8)).toBe("polimento");
    expect(campaignPhase(7)).toBe("semana");
    expect(campaignPhase(0)).toBe("semana");
    expect(campaignPhase(-1)).toBe("encerrada");
  });
});

describe("XP de competição", () => {
  it("fica fora de um teto e escolhe uma competição por dia", () => {
    const full: CompetitionXpRow = { id: "a", date: "2026-03-01", status: "done", placement: "ouro", wins: 2, matches: 2 };
    const historical: CompetitionXpRow = { id: "b", date: "2026-03-01", status: "done", placement: "ouro", wins: 0, matches: 0 };
    const other: CompetitionXpRow = { id: "c", date: "2026-06-01", status: "done", placement: "prata", wins: 1, matches: 1 };
    expect(rowXp(full)).toBe(220);
    expect(rowXp(historical)).toBe(40);
    expect(rowXp({ ...full, wins: 7, matches: 7, placement: null })).toBe(100 + 6 * 20);
    const bonus = competitionBonusXp([full, historical, other]);
    expect(bonus.awarded.sort()).toEqual(["a", "c"]);
    expect(bonus.total).toBe(220 + 170);
    expect(bonus.total).toBeGreaterThan(150);
  });

  it("ignora competição planejada", () => {
    expect(competitionBonusXp([{ id: "p", date: "2027-01-30", status: "planned", placement: null, wins: 0, matches: 0 }]).total).toBe(0);
  });
});

describe("métricas de competição", () => {
  it("esconde taxa quando a amostra é curta e mostra quando passa de 4", () => {
    const thin = competitionReport(
      [comp({ id: "c", date: "2026-01-01", placement: "ouro" })],
      [match({ id: "m", competitionId: "c", result: "vitoria", method: "finalizacao" })],
      { rolas: 10, submissionRate: 0.2 },
    );
    expect(thin.winRate).toBeNull();
    expect(thin.versusTraining.status).toBe("low");
    expect(thin.versusTraining.pct).toBeNull();

    const matches = Array.from({ length: MIN_BASELINE }, (_, index) => match({
      id: `m${index}`,
      competitionId: "c",
      result: "vitoria",
      method: index === 0 ? "finalizacao" : "pontos",
      stage: index === 0 ? "final" : "quartas",
    }));
    const ready = competitionReport(
      [comp({ id: "c", date: "2026-01-01", placement: "prata" })],
      matches,
      { rolas: 8, submissionRate: 0.1 },
    );
    expect(ready.winRate).toBe(1);
    expect(ready.submissionWinRate).toBeCloseTo(0.25);
    expect(ready.pointsSample).toBe(true);
    expect(ready.byStage.find((item) => item.stage === "quartas")?.rate).toBeNull();
    expect(ready.versusTraining.status).not.toBe("low");
  });

  it("empate não entra na taxa de vitória", () => {
    const matches = [
      ...Array.from({ length: 4 }, (_, index) => match({ id: `w${index}`, competitionId: "c", result: "vitoria" })),
      match({ id: "d", competitionId: "c", result: "empate" }),
    ];
    const report = competitionReport([comp({ id: "c", date: "2026-01-01" })], matches, { rolas: 4, submissionRate: 0 });
    expect(report.winRate).toBe(1);
  });
});

describe("prontidão", () => {
  it("renormaliza quando não há peso e trava o índice", () => {
    expect(weightScore(82, 82)).toBe(1);
    expect(weightScore(83, 82)).toBeCloseTo(0.8);
    expect(weightScore(85, 82)).toBe(0);
    expect(readinessIndex([
      { key: "adherence", score: 1, weight: 30 },
      { key: "fight", score: 0, weight: 20 },
      { key: "simulation", score: 0, weight: 15 },
      { key: "standing", score: 0, weight: 10 },
      { key: "focus", score: 0, weight: 15 },
    ])).toBe(33);
    const full = assessCampaign({
      today: "2026-11-12",
      startDate: "2026-11-01",
      eventDate: "2027-01-30",
      weeklyTrainingTarget: 3,
      weeklyRolaTarget: 1,
      trainingDates: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"],
      rolas: Array.from({ length: 4 }, (_, index) => ({
        occurredOn: "2026-11-09",
        sessionId: `s${index}`,
        durationMinutes: 8,
        simulation: true,
        startedStanding: true,
        scored: true,
        queda: false,
      })),
      matchMinutes: 7,
      focusScore: 1,
      targetWeightKg: null,
      currentWeightKg: null,
    });
    expect(full.phase).toBe("base");
    expect(full.days).toBe(79);
    expect(full.readiness).toBe(100);
    expect(full.quest.done).toBe(false);
  });

  it("libera Campanha completa só com adesão alta depois da data", () => {
    const closed = campaignMessages({
      planId: "p",
      name: "Copa",
      startDate: "2026-01-01",
      eventDate: "2026-03-01",
      today: "2026-03-02",
      adherence: 0.8,
      active: true,
    });
    expect(closed.some((entry) => entry.id === "titulo:campanha-completa:p")).toBe(true);
    const short = campaignMessages({
      planId: "p",
      name: "Copa",
      startDate: "2026-01-01",
      eventDate: "2026-03-01",
      today: "2026-03-02",
      adherence: 0.79,
      active: true,
    });
    expect(short.some((entry) => entry.body.includes("Campanha completa"))).toBe(false);
    const future = campaignMessages({
      planId: "p",
      name: "Copa Verão",
      startDate: "2026-11-01",
      eventDate: "2027-01-30",
      today: "2026-11-12",
      adherence: 1,
      active: true,
    });
    expect(future[0]?.body).toBe("[SISTEMA] Campanha iniciada: Copa Verão em 79 dias.");
    expect(future.some((entry) => entry.body.includes("Polimento"))).toBe(false);
  });
});

describe("títulos de chave", () => {
  it("abre a linha e o ouro duplo a partir dos fatos", () => {
    const honors = competitionHonors({
      founded: true,
      foundedOn: "2026-01-01",
      matches: [],
      competitions: [
        comp({ id: "a", date: "2026-03-01", placement: "ouro", absolutePlacement: "ouro" }),
        comp({ id: "b", date: "2026-06-01", placement: "prata" }),
        comp({ id: "c", date: "2026-09-01", placement: "bronze" }),
      ],
    });
    expect(honors.map((item) => item.title)).toEqual(["Fundador", "Estreante", "Medalhista", "Campeão", "Duplo ouro"]);
  });
});

describe("leitura da competição", () => {
  it("lê o que está no texto e descarta número inventado", () => {
    const text = "Copa Sul IBJJF, ouro no kimono. Final contra João, vitória por finalização em 4 min, 2 a 0.";
    const parsed = parseCompetitionText(text);
    expect(parsed.organization).toBe("ibjjf");
    expect(parsed.placement).toBe("ouro");
    expect(parsed.modality).toBe("gi");
    expect(parsed.matches[0]).toMatchObject({ opponentName: "João", method: "finalizacao", pointsFor: 2, pointsAgainst: 0, stage: "final" });
    expect(numberIsInText(9, text)).toBe(false);
    const grounded = groundCompetition({
      name: "Copa Sul",
      matches: [{ opponentName: "João", result: "vitoria", method: "finalizacao", pointsFor: 9, pointsAgainst: 0, stage: "final" }],
    }, text);
    expect(grounded?.matches[0]?.pointsFor).toBe(0);
    expect(grounded?.matches.find((item) => item.opponentName === "Fantasma")).toBeUndefined();
  });
});
