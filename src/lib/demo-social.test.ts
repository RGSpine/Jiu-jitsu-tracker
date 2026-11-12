import { describe, expect, it } from "vitest";
import { createSeed } from "@/lib/demo-db";
import { demoSearchAthletes, demoTeamCards } from "@/lib/demo-social";
import { DEMO_ROBERTO_ID } from "@/lib/sample-data";
import { DEMO_PEDRO_ID } from "@/lib/sample-social";

describe("demonstração social", () => {
  it("busca só quem é descobrível e não devolve e-mail", () => {
    const db = { ...createSeed("2026-11-12"), currentUserId: DEMO_ROBERTO_ID };
    const email = demoSearchAthletes(db, "pedro@tatame.dev");
    expect(email).toEqual([]);
    const hits = demoSearchAthletes(db, "pedro");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.displayName).toBe("Pedro Nunes");
    expect(hits[0]).not.toHaveProperty("email");
    expect(Object.keys(hits[0] ?? {}).sort()).toEqual(["academy", "belt", "displayName", "id", "username"]);
  });

  it("Pedro não vê a equipe", () => {
    const db = { ...createSeed("2026-11-12"), currentUserId: DEMO_PEDRO_ID };
    expect(demoTeamCards(db, "2026-11-12")).toEqual([]);
    const roberto = { ...db, currentUserId: DEMO_ROBERTO_ID };
    const cards = demoTeamCards(roberto, "2026-11-12");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.members).toHaveLength(4);
    expect(cards[0]?.name).toBe("Tatame Central");
  });
});
