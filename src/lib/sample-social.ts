import { addDays } from "@/lib/dates";
import {
  DEMO_ANA_ID,
  DEMO_LUCAS_ID,
  DEMO_ROBERTO_ID,
} from "@/lib/sample-data";
import type { Competition, CompetitionMatch, PrepPlan, Profile, StoredSession, Team, TeamMember } from "@/lib/types";

export const DEMO_MARINA_ID = "44444444-4444-4444-8444-444444444444";
export const DEMO_PEDRO_ID = "55555555-5555-4555-8555-555555555551";
export const DEMO_TEAM_ID = "55555555-5555-4555-8555-555555555555";
export const DEMO_COMP_OURO = "66666666-6666-4666-8666-666666666661";
export const DEMO_COMP_PRATA = "66666666-6666-4666-8666-666666666662";
export const DEMO_COMP_BRONZE = "66666666-6666-4666-8666-666666666663";
export const DEMO_COMP_CAMPANHA = "66666666-6666-4666-8666-666666666664";
export const DEMO_PLAN_ID = "77777777-7777-4777-8777-777777777777";

export const EXTRA_PROFILES: Profile[] = [
  {
    id: DEMO_MARINA_ID,
    email: "marina@tatame.dev",
    displayName: "Marina Costa",
    username: "marina",
    belt: "azul",
    stripes: 1,
    academy: "Academia Sul",
    preferredModality: "gi",
    shareProgress: true,
    discoverable: true,
  },
  {
    id: DEMO_PEDRO_ID,
    email: "pedro@tatame.dev",
    displayName: "Pedro Nunes",
    username: "pedro",
    belt: "branca",
    stripes: 2,
    academy: "CT Nova Guarda",
    preferredModality: "nogi",
    shareProgress: false,
    discoverable: true,
  },
];

export function demoTeam(today: string): { team: Team; members: TeamMember[] } {
  const team: Team = {
    id: DEMO_TEAM_ID,
    name: "Tatame Central",
    slug: "tatame-central",
    ownerId: DEMO_ROBERTO_ID,
    inviteCode: "tatame24",
    createdAt: addDays(today, -40),
  };
  const members: TeamMember[] = [DEMO_ROBERTO_ID, DEMO_ANA_ID, DEMO_LUCAS_ID, DEMO_MARINA_ID].map((userId) => ({
    teamId: team.id,
    userId,
    role: userId === DEMO_ROBERTO_ID ? "owner" : "member",
    status: "active",
    joinedAt: team.createdAt,
  }));
  return { team, members };
}

export function demoCompetitions(): { competitions: Competition[]; matches: CompetitionMatch[] } {
  const competitions: Competition[] = [
    {
      id: DEMO_COMP_OURO,
      userId: DEMO_ROBERTO_ID,
      name: "Copa Norte",
      organization: "ibjjf",
      date: "2026-03-15",
      city: "Recife",
      modality: "gi",
      belt: "roxa",
      ageDivision: "adulto",
      weightClass: "médio",
      absolute: true,
      absolutePlacement: "ouro",
      status: "done",
      placement: "ouro",
      notes: "",
    },
    {
      id: DEMO_COMP_PRATA,
      userId: DEMO_ROBERTO_ID,
      name: "Open Sul",
      organization: "cbjj",
      date: "2026-06-20",
      city: "Curitiba",
      modality: "nogi",
      belt: "roxa",
      ageDivision: "adulto",
      weightClass: "médio",
      absolute: false,
      absolutePlacement: null,
      status: "done",
      placement: "prata",
      notes: "",
    },
    {
      id: DEMO_COMP_BRONZE,
      userId: DEMO_ROBERTO_ID,
      name: "Estadual",
      organization: "ibjjf",
      date: "2026-09-12",
      city: "Florianópolis",
      modality: "gi",
      belt: "roxa",
      ageDivision: "adulto",
      weightClass: "médio",
      absolute: false,
      absolutePlacement: null,
      status: "done",
      placement: "bronze",
      notes: "",
    },
    {
      id: DEMO_COMP_CAMPANHA,
      userId: DEMO_ROBERTO_ID,
      name: "Copa Verão",
      organization: "ibjjf",
      date: "2027-01-30",
      city: "São Paulo",
      modality: "gi",
      belt: "roxa",
      ageDivision: "adulto",
      weightClass: "médio",
      absolute: false,
      absolutePlacement: null,
      status: "planned",
      placement: null,
      notes: "",
    },
  ];
  const matches: CompetitionMatch[] = [
    ...bout(DEMO_COMP_OURO, [
      ["oitavas", "vitoria", "finalizacao", "triangulo", 0, 0],
      ["quartas", "vitoria", "pontos", null, 6, 0],
      ["semi", "vitoria", "finalizacao", "mata-leao", 4, 0],
      ["final", "vitoria", "pontos", null, 2, 0],
      ["absoluto", "vitoria", "finalizacao", "guilhotina", 0, 0],
    ]),
    ...bout(DEMO_COMP_PRATA, [
      ["oitavas", "vitoria", "pontos", null, 4, 2],
      ["quartas", "vitoria", "finalizacao", "armlock", 2, 0],
      ["semi", "derrota", "pontos", null, 0, 2],
    ]),
    ...bout(DEMO_COMP_BRONZE, [
      ["quartas", "vitoria", "pontos", null, 8, 0],
      ["semi", "derrota", "finalizacao", null, 0, 0],
      ["outro", "vitoria", "pontos", null, 2, 0],
    ]),
  ];
  return { competitions, matches };
}

function bout(
  competitionId: string,
  rows: [CompetitionMatch["stage"], CompetitionMatch["result"], CompetitionMatch["method"], string | null, number, number][],
): CompetitionMatch[] {
  return rows.map((row, index) => ({
    id: `66666666-6666-4666-8${competitionId.slice(-3)}-${String(index + 1).padStart(12, "0")}`,
    competitionId,
    order: index + 1,
    stage: row[0],
    opponentName: `Atleta ${index + 1}`,
    result: row[1],
    method: row[2],
    techniqueId: row[3],
    pointsFor: row[4],
    pointsAgainst: row[5],
    advantagesFor: 0,
    advantagesAgainst: 0,
    penaltiesFor: 0,
    penaltiesAgainst: 0,
    durationSeconds: 360,
    notes: "",
  }));
}

export function demoPlan(): PrepPlan {
  return {
    id: DEMO_PLAN_ID,
    competitionId: DEMO_COMP_CAMPANHA,
    userId: DEMO_ROBERTO_ID,
    startDate: "2026-11-01",
    weeklyTrainingTarget: 4,
    weeklyRolaTarget: 8,
    focusAttributes: ["passagem", "guarda", "estrangulamento"],
    targetWeightKg: 82,
    currentWeightKg: 83.4,
    active: true,
  };
}

export function attendanceSessions(today: string): StoredSession[] {
  const days = [today, addDays(today, -1), addDays(today, -2)];
  const people = [DEMO_ANA_ID, DEMO_LUCAS_ID, DEMO_MARINA_ID];
  return people.flatMap((userId, person) => days.slice(0, person === 0 ? 2 : 1).map((date, index) => ({
    id: `88888888-8888-4888-8888-${String(person * 10 + index).padStart(12, "0")}`,
    userId,
    date,
    modality: "gi" as const,
    notes: "",
    federationId: "ibjjf",
  })));
}
