import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
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
    expect(view.titles.some((item) => item.title === "Finalizador de Pé")).toBe(false);
  });

  it("chave de braço dá XP e surpresa, sem atributo próprio", () => {
    const view = buildProgress([
      rola({ submissionsApplied: [{ id: "kimura" }, { id: "armlock" }] }),
    ], "2026-11-02");
    expect(view.attributes.map((item) => item.id)).toEqual([
      "queda", "passagem", "raspagem", "guarda", "costas", "pes", "estrangulamento", "defesa", "pontuacao",
    ]);
    expect(view.attributes.every((item) => item.level === 0)).toBe(true);
    expect(view.xp).toBeGreaterThan(PROGRESSION.showUp);
    expect(view.lines.find((item) => item.id === "surpresa-chave")?.unlocked).toBe(true);
    expect(view.lines.find((item) => item.id === "surpresa-chave")?.name).toBe("Chave");
  });

  it("não libera Trator nem Finalizador de Pé com amostra pequena", () => {
    const passes = Array.from({ length: 6 }, (_, index) => rola({
      sessionId: `p${index}`,
      techniquesUsed: [{ id: "passagem-de-joelho", category: "passagem" }],
    }));
    const feet = Array.from({ length: 4 }, (_, index) => rola({
      occurredOn: "2026-11-03",
      sessionId: `f${index}`,
      modality: "nogi",
      submissionsApplied: [{ id: "heel-hook" }],
    }));
    const view = buildProgress([...passes, ...feet], "2026-11-11");
    expect(view.titles.some((item) => item.title === "Passador")).toBe(false);
    expect(view.titles.some((item) => item.title === "Trator Humano")).toBe(false);
    expect(view.titles.some((item) => item.title === "Finalizador de Pé")).toBe(false);
    expect(view.titles.some((item) => item.title === "Pegador de Pé")).toBe(false);
  });

  it("esconde a surpresa até ela acontecer", () => {
    const view = buildProgress([rola()], "2026-11-02");
    const secret = view.lines.find((item) => item.id === "surpresa-triangulo");
    expect(secret?.hidden).toBe(true);
    expect(secret?.name).toBe("???");
  });

  it("não chama ninguém de o Duro sem amostra", () => {
    const view = buildProgress(Array.from({ length: 8 }, (_, index) => rola({
      sessionId: `w${index}`,
      result: "vitoria",
      occurredOn: `2026-11-${String(index + 1).padStart(2, "0")}`,
    })), "2026-11-11");
    expect(view.epithets.find((item) => item.id === "o-duro")?.unlocked).toBe(false);
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
    expect(events.some((event) => event.kind === "surpresa" && event.body.includes("Triângulo"))).toBe(true);
    expect(events.every((event) => event.body.startsWith("[SISTEMA]"))).toBe(true);
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
      pointsAgainst: rola.pointsPartner,
      result: rola.result,
      opponentUserId: rola.partnerUserId,
      submissionsApplied: rola.actions.filter((action) => action.performer === "self" && action.actionType === "finalizacao").map((action) => ({ id: action.techniqueId })),
      submissionsSuffered: rola.actions.filter((action) => action.performer === "partner" && action.actionType === "finalizacao").map((action) => ({ id: action.techniqueId })),
      techniquesUsed: rola.actions.filter((action) => action.performer === "self" && action.actionType === "tecnica").map((action) => ({ id: action.techniqueId })),
    })), "2026-11-11");
    expect(view.level).toBeGreaterThan(8);
    expect(view.level).toBeLessThan(24);
    expect(view.lines.filter((line) => line.unlocked && !line.hidden).length).toBeGreaterThan(2);
    expect(view.titles.some((item) => item.title === "Trator Humano" || item.title === "Passador")).toBe(true);
    expect(view.quests.length).toBeGreaterThan(0);
    expect(view.superacoes.filter((item) => item.unlocked).map((item) => item.id)).toEqual(
      expect.arrayContaining(["sup-recomeco", "sup-derrota"]),
    );
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

describe("superação", () => {
  const on = (date: string, sessionId: string, partial: Partial<ProgressRola> = {}) => rola({ occurredOn: date, sessionId, ...partial });

  it("esconde os oito até acontecerem", () => {
    const view = buildProgress([rola({ occurredOn: "2026-06-01" })], "2026-06-01");
    expect(view.superacoes).toHaveLength(8);
    expect(view.superacoes.every((item) => !item.unlocked && item.name === "???")).toBe(true);
  });

  it("recomeço abre em 30 dias e não em 29", () => {
    const early = buildProgress([
      on("2026-01-01", "a"),
      on("2026-01-30", "b"),
    ], "2026-01-30");
    const exact = buildProgress([
      on("2026-01-01", "a"),
      on("2026-01-31", "b"),
    ], "2026-01-31");
    expect(early.superacoes.find((item) => item.id === "sup-recomeco")?.unlocked).toBe(false);
    expect(exact.superacoes.find((item) => item.id === "sup-recomeco")?.unlocked).toBe(true);
    expect(exact.log.find((item) => item.id === "sup-recomeco")?.body).toBe(
      "[SISTEMA] Título desbloqueado: Recomeço. Primeiro treino depois de 30 dias parado.",
    );
  });

  it("adversidade exige o terceiro treino até o 14º dia da volta", () => {
    const previous = "2026-01-11";
    const ret = "2026-02-01";
    const edge = addDays(ret, PROGRESSION.janelaAdversidade - 1);
    const late = addDays(ret, PROGRESSION.janelaAdversidade);
    const inside = buildProgress([
      on(previous, "old"),
      on(ret, "r"),
      on(addDays(ret, 2), "b"),
      on(edge, "c"),
    ], edge);
    const outside = buildProgress([
      on(previous, "old"),
      on(ret, "r"),
      on(addDays(ret, 2), "b"),
      on(late, "c"),
    ], late);
    const shortGap = buildProgress([
      on("2026-01-12", "old"),
      on(ret, "r"),
      on(addDays(ret, 2), "b"),
      on(edge, "c"),
    ], edge);
    expect(inside.superacoes.find((item) => item.id === "sup-adversidades")?.unlocked).toBe(true);
    expect(outside.superacoes.find((item) => item.id === "sup-adversidades")?.unlocked).toBe(false);
    expect(shortGap.superacoes.find((item) => item.id === "sup-adversidades")?.unlocked).toBe(false);
  });

  it("empate não quebra nem conta a sequência de derrotas", () => {
    const losses = (count: number) => Array.from({ length: count }, () => on("2026-03-01", "s", { result: "derrota" }));
    const four = buildProgress([
      ...losses(4),
      on("2026-03-01", "s", { result: "vitoria" }),
    ], "2026-03-01");
    const withDraw = buildProgress([
      ...losses(2),
      on("2026-03-01", "s", { result: "empate" }),
      ...losses(3),
      on("2026-03-01", "s", { result: "vitoria" }),
    ], "2026-03-01");
    const five = buildProgress([
      ...losses(5),
      on("2026-03-01", "s", { result: "vitoria" }),
    ], "2026-03-01");
    expect(four.superacoes.find((item) => item.id === "sup-derrota")?.unlocked).toBe(false);
    expect(withDraw.superacoes.find((item) => item.id === "sup-derrota")?.unlocked).toBe(true);
    expect(five.log.find((item) => item.id === "sup-derrota")?.body).toContain("5 derrotas seguidas");
  });

  it("virada de maré pede jejum de 8 rolas e maioria de derrotas", () => {
    const dry = (result: ProgressRola["result"]) => on("2026-04-01", "s", { result });
    const majority = [
      ...Array.from({ length: 5 }, () => dry("derrota")),
      ...Array.from({ length: 3 }, () => dry("empate")),
      on("2026-04-01", "s", { submissionsApplied: [{ id: "triangulo" }], result: "vitoria" }),
    ];
    const half = [
      ...Array.from({ length: 4 }, () => dry("derrota")),
      ...Array.from({ length: 4 }, () => dry("empate")),
      on("2026-04-01", "s", { submissionsApplied: [{ id: "triangulo" }], result: "vitoria" }),
    ];
    const broken = [
      ...Array.from({ length: 4 }, () => dry("derrota")),
      on("2026-04-01", "s", { submissionsApplied: [{ id: "guilhotina" }], result: "vitoria" }),
      ...Array.from({ length: 8 }, () => dry("derrota")),
    ];
    expect(buildProgress(majority, "2026-04-01").superacoes.find((item) => item.id === "sup-mare")?.unlocked).toBe(true);
    expect(buildProgress(half, "2026-04-01").superacoes.find((item) => item.id === "sup-mare")?.unlocked).toBe(false);
    expect(buildProgress(broken, "2026-04-01").superacoes.find((item) => item.id === "sup-mare")?.unlocked).toBe(false);
  });

  it("fênix pede 60 dias e 4 semanas com 2 treinos", () => {
    const ret = "2026-06-01";
    const sessions = [on("2026-04-02", "old")];
    for (let week = 0; week < 4; week += 1) {
      const start = addDays(ret, week * 7);
      sessions.push(on(start, `w${week}a`), on(addDays(start, 2), `w${week}b`));
    }
    const ready = buildProgress(sessions, addDays(ret, 24));
    const short = buildProgress([
      on("2026-04-03", "old"),
      ...sessions.slice(1),
    ], addDays(ret, 24));
    expect(pauseDaysSafe("2026-04-02", ret)).toBe(60);
    expect(ready.superacoes.find((item) => item.id === "sup-fenix")?.unlocked).toBe(true);
    expect(short.superacoes.find((item) => item.id === "sup-fenix")?.unlocked).toBe(false);
  });

  it("persistente volta em até 2 dias, não em 3, e exige o dia ruim", () => {
    const bad = [
      on("2026-05-01", "bad", { result: "derrota" }),
      on("2026-05-01", "bad", { result: "derrota" }),
      on("2026-05-01", "bad", { result: "empate" }),
      on("2026-05-01", "bad", { result: "derrota" }),
    ];
    expect(buildProgress([...bad, on("2026-05-03", "back")], "2026-05-03").superacoes.find((item) => item.id === "sup-persistente")?.unlocked).toBe(true);
    expect(buildProgress([...bad, on("2026-05-04", "back")], "2026-05-04").superacoes.find((item) => item.id === "sup-persistente")?.unlocked).toBe(false);
    const short = [
      on("2026-05-01", "bad", { result: "derrota" }),
      on("2026-05-01", "bad", { result: "derrota" }),
      on("2026-05-02", "back"),
    ];
    const spoiled = [
      on("2026-05-01", "bad", { result: "derrota" }),
      on("2026-05-01", "bad", { result: "vitoria" }),
      on("2026-05-01", "bad", { result: "derrota" }),
      on("2026-05-02", "back"),
    ];
    expect(buildProgress(short, "2026-05-02").superacoes.find((item) => item.id === "sup-persistente")?.unlocked).toBe(false);
    expect(buildProgress(spoiled, "2026-05-02").superacoes.find((item) => item.id === "sup-persistente")?.unlocked).toBe(false);
  });

  it("sobrevivente olha só o treino imediatamente seguinte", () => {
    const beaten = [
      on("2026-07-01", "a", { submissionsSuffered: [{ id: "mata-leao" }] }),
      on("2026-07-01", "a", { submissionsSuffered: [{ id: "guilhotina" }] }),
      on("2026-07-01", "a", { submissionsSuffered: [{ id: "triangulo" }] }),
    ];
    const clean = Array.from({ length: 5 }, () => on("2026-07-02", "b"));
    const between = [on("2026-07-02", "mid")];
    expect(buildProgress([...beaten, ...clean], "2026-07-02").superacoes.find((item) => item.id === "sup-sobrevivente")?.unlocked).toBe(true);
    expect(buildProgress([...beaten, ...between, ...clean.map((item) => ({ ...item, occurredOn: "2026-07-03", sessionId: "later" }))], "2026-07-03").superacoes.find((item) => item.id === "sup-sobrevivente")?.unlocked).toBe(false);
  });

  it("acerto de contas ignora oponente sem vínculo e empate", () => {
    const linked = (result: ProgressRola["result"]) => on("2026-08-01", "s", { result, opponentUserId: "ana" });
    const yes = buildProgress([
      linked("derrota"),
      linked("empate"),
      linked("derrota"),
      linked("derrota"),
      linked("vitoria"),
    ], "2026-08-01");
    const loose = buildProgress([
      on("2026-08-01", "s", { result: "derrota", opponentUserId: null }),
      on("2026-08-01", "s", { result: "derrota", opponentUserId: null }),
      on("2026-08-01", "s", { result: "derrota", opponentUserId: null }),
      on("2026-08-01", "s", { result: "vitoria", opponentUserId: null }),
    ], "2026-08-01");
    const reset = buildProgress([
      linked("derrota"),
      linked("derrota"),
      linked("vitoria"),
      linked("derrota"),
      linked("derrota"),
      linked("vitoria"),
    ], "2026-08-01");
    expect(yes.superacoes.find((item) => item.id === "sup-acerto")?.unlocked).toBe(true);
    expect(loose.superacoes.find((item) => item.id === "sup-acerto")?.unlocked).toBe(false);
    expect(reset.superacoes.find((item) => item.id === "sup-acerto")?.unlocked).toBe(false);
  });

  it("soma 30 XP uma vez, fora do teto do dia", () => {
    const rows = [
      ...Array.from({ length: 5 }, () => on("2026-03-01", "s", { result: "derrota", durationMinutes: 6 })),
      on("2026-03-01", "s", { result: "vitoria", durationMinutes: 6 }),
    ];
    const view = buildProgress(rows, "2026-03-01");
    expect(view.log.filter((item) => item.kind === "superacao")).toHaveLength(1);
    expect(view.xp).toBe(85 + PROGRESSION.superacaoXp);
  });
});

function pauseDaysSafe(previous: string, next: string): number {
  const [ay, am, ad] = previous.split("-").map(Number);
  const [by, bm, bd] = next.split("-").map(Number);
  return Math.round((Date.UTC(by ?? 0, (bm ?? 1) - 1, bd ?? 1) - Date.UTC(ay ?? 0, (am ?? 1) - 1, ad ?? 1)) / 86_400_000);
}

describe("teto do dia", () => {
  it("não passa do teto mesmo com ritmo", () => {
    const xp = dayXp({ minutes: 500, rolas: 40, subs: 20, points: 80 }, 99);
    expect(xp).toBe(PROGRESSION.dailyCap);
  });
});
