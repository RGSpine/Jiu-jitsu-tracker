import { describe, expect, it } from "vitest";
import { canReadTeam, fundadorUnlocked, projectMember, teamQuestEvent, weekTrainingCount } from "@/lib/teams";
import type { TeamMember } from "@/lib/types";

function member(userId: string, status: TeamMember["status"] = "active"): TeamMember {
  return { teamId: "t", userId, role: userId === "owner" ? "owner" : "member", status, joinedAt: "2026-01-01" };
}

describe("acesso à equipe", () => {
  it("não membro não lê a equipe", () => {
    const members = [member("owner"), member("ana"), member("lucas"), member("marina")];
    expect(canReadTeam(members, "pedro")).toBe(false);
    expect(canReadTeam(members, "ana")).toBe(true);
    expect(canReadTeam([member("convidado", "invited")], "convidado")).toBe(true);
    expect(canReadTeam([member("fora", "invited")], "pedro")).toBe(false);
  });

  it("esconde presença, nível e título de quem não autorizou", () => {
    const view = projectMember({
      viewerId: "owner",
      member: member("ana"),
      displayName: "Ana Souza",
      belt: "azul",
      shareProgress: false,
      level: 8,
      title: "Passador",
      weeklyTrainings: 3,
    });
    expect(view.displayName).toBe("Ana Souza");
    expect(view.belt).toBe("azul");
    expect(view.level).toBeNull();
    expect(view.title).toBeNull();
    expect(view.weeklyTrainings).toBeNull();
    expect(view).not.toHaveProperty("rolas");
  });

  it("mostra os próprios números", () => {
    const view = projectMember({
      viewerId: "ana",
      member: member("ana"),
      displayName: "Ana Souza",
      belt: "azul",
      shareProgress: false,
      level: 4,
      title: "Presente",
      weeklyTrainings: 2,
    });
    expect(view.weeklyTrainings).toBe(2);
    expect(view.level).toBe(4);
  });
});

describe("missão e fundador", () => {
  it("conta treinos da semana e só avisa ao chegar em 20", () => {
    const sessions = Array.from({ length: 19 }, (_, index) => ({ userId: index % 2 === 0 ? "a" : "b", date: "2026-11-10" }));
    expect(weekTrainingCount(sessions, ["a", "b"], "2026-11-12")).toBe(19);
    expect(teamQuestEvent("t", "Tatame Central", "2026-11-12", 19)).toBeNull();
    const event = teamQuestEvent("t", "Tatame Central", "2026-11-12", 20);
    expect(event?.id).toBe("equipe-missao:t:2026-11-09");
    expect(event?.body).toContain("20 treinos");
  });

  it("Fundador exige 3 membros ativos na equipe criada", () => {
    expect(fundadorUnlocked([{ ownerId: "owner", members: [member("owner"), member("ana")] }], "owner")).toBe(false);
    expect(fundadorUnlocked([{ ownerId: "owner", members: [member("owner"), member("ana"), member("lucas")] }], "owner")).toBe(true);
    expect(fundadorUnlocked([{ ownerId: "outro", members: [member("owner"), member("ana"), member("lucas")] }], "owner")).toBe(false);
  });
});
