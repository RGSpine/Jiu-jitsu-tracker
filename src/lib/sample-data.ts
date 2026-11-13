import { techniques } from "@/data/catalog";
import { defaultFederation, rulesFor } from "@/data/rules";
import { addDays, parseIso } from "@/lib/dates";
import { suggestPoints } from "@/lib/scoring";
import type { Modality, Result, StoredRola, StoredSession, Technique } from "@/lib/types";

export const DEMO_ROBERTO_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_ANA_ID = "22222222-2222-4222-8222-222222222222";
export const DEMO_LUCAS_ID = "33333333-3333-4333-8333-333333333333";

const FREE_PARTNERS = [
  "João Lima",
  "Maria Costa",
  "Pedro Alves",
  "Camila Rocha",
  "Diego Martins",
  "Fernanda Dias",
  "Bruno Teixeira",
  "Larissa Nunes",
];

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

function trainsOn(iso: string): boolean {
  const day = parseIso(iso).getDay();
  if (day === 2 || day === 4 || day === 6) return true;
  if (day === 1 || day === 3) return Number(iso.replaceAll("-", "")) % 2 === 0;
  return false;
}

function pool(modality: Modality, category: Technique["category"]): Technique[] {
  return techniques.filter(
    (item) =>
      item.category === category && (item.modality === "both" || item.modality === modality),
  );
}

function takeUnique(rng: () => number, items: Technique[], count: number): string[] {
  const copy = [...items];
  const chosen: string[] = [];
  while (copy.length > 0 && chosen.length < count) {
    const index = Math.floor(rng() * copy.length);
    chosen.push(copy.splice(index, 1)[0]!.id);
  }
  return chosen;
}

export type SampleBundle = {
  sessions: StoredSession[];
  rolas: StoredRola[];
};

export function buildPersonalSample(options: {
  userId: string;
  userName: string;
  today: string;
  seed?: number;
  idOffset?: number;
  linkedPartner?: { id: string; name: string };
  linkEvery?: number;
}): SampleBundle {
  const rng = mulberry32(options.seed ?? 20261111);
  const federationId = defaultFederation().id;
  const rules = rulesFor(federationId);
  const sessions: StoredSession[] = [];
  const rolas: StoredRola[] = [];
  let serial = options.idOffset ?? 1;
  const start = addDays(options.today, -340);
  const dates: string[] = [];

  for (let iso = start; iso <= options.today; iso = addDays(iso, 1)) {
    if (trainsOn(iso)) dates.push(iso);
  }
  const recent = [addDays(options.today, -2), addDays(options.today, -1), options.today];
  for (const iso of recent) {
    if (!dates.includes(iso)) dates.push(iso);
  }
  dates.sort();
  const back = addDays(options.today, -18);
  const away = addDays(back, -31);
  const kept = dates.filter((date) => date <= away || date >= back);

  kept.forEach((date, sessionIndex) => {
    const progress = sessionIndex / Math.max(1, kept.length - 1);
    const modality: Modality = rng() < 0.82 ? "nogi" : "gi";
    const sessionId = uuid(serial);
    serial += 1;
    const rolaCount = 3 + Math.floor(rng() * 3);
    sessions.push({
      id: sessionId,
      userId: options.userId,
      date,
      modality,
      notes: "",
      federationId,
    });

    for (let index = 0; index < rolaCount; index += 1) {
      const linked =
        options.linkedPartner && (sessionIndex + index) % (options.linkEvery ?? 5) === 0;
      const partnerName = linked ? options.linkedPartner!.name : pick(rng, FREE_PARTNERS);
      const partnerUserId = linked ? options.linkedPartner!.id : null;
      const roll = rng();
      const winCut = 0.3 + progress * 0.28;
      const result: Result =
        roll < winCut ? "vitoria" : roll < winCut + 0.34 ? "derrota" : roll < 0.94 ? "empate" : "sem_resultado";
      const finished = result === "vitoria" && rng() < 0.32 + progress * 0.4;
      const suffered = result === "derrota" && rng() < 0.62 - progress * 0.28;
      const passes = pool(modality, "passagem");
      const scoringPool = [
        ...pool(modality, "queda"),
        ...pool(modality, "raspagem"),
        ...passes,
        ...(progress > 0.45 ? passes : []),
        ...pool(modality, "controle").filter((item) => item.scoringCode),
      ];
      const techniqueCount =
        result === "sem_resultado" ? 1 : result === "empate" ? 1 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 3);
      const techniquesUsed = takeUnique(rng, scoringPool, techniqueCount);
      const submissionsApplied = finished ? takeUnique(rng, pool(modality, "finalizacao"), 1) : [];
      const submissionsSuffered = suffered ? takeUnique(rng, pool(modality, "finalizacao"), 1) : [];
      const pointsFor = result === "sem_resultado" ? 0 : suggestPoints(techniquesUsed, techniques, rules);
      let pointsAgainst = 0;
      if (result === "vitoria") pointsAgainst = Math.max(0, pointsFor - (2 + Math.floor(rng() * 2) * 2));
      if (result === "derrota") pointsAgainst = pointsFor + 2 + Math.floor(rng() * 3) * 2;
      if (result === "empate") pointsAgainst = pointsFor;

      const rolaId = uuid(serial);
      serial += 1;
      rolas.push({
        id: rolaId,
        sessionId,
        athleteId: options.userId,
        athleteName: options.userName,
        partnerUserId,
        partnerName,
        occurredOn: date,
        modality,
        federationId,
        durationMinutes: rng() < 0.7 ? 6 : rng() < 0.5 ? 5 : 8,
        result,
        pointsAthlete: pointsFor,
        pointsPartner: pointsAgainst,
        advantagesAthlete: rng() < 0.35 ? 1 : 0,
        advantagesPartner: rng() < 0.25 ? 1 : 0,
        penaltiesAthlete: rng() < 0.08 ? 1 : 0,
        penaltiesPartner: rng() < 0.08 ? 1 : 0,
        actions: [
          ...techniquesUsed.map((techniqueId) => ({
            techniqueId,
            performer: "self" as const,
            actionType: "tecnica" as const,
          })),
          ...submissionsApplied.map((techniqueId) => ({
            techniqueId,
            performer: "self" as const,
            actionType: "finalizacao" as const,
          })),
          ...submissionsSuffered.map((techniqueId) => ({
            techniqueId,
            performer: "partner" as const,
            actionType: "finalizacao" as const,
          })),
        ],
      });
    }
  });

  const partner = options.linkedPartner ?? { id: "parceiro-vinculado", name: "Parceiro" };
  const streakSession = uuid(serial);
  serial += 1;
  sessions.push({
    id: streakSession,
    userId: options.userId,
    date: options.today,
    modality: "nogi",
    notes: "",
    federationId,
  });
  for (let index = 0; index < 6; index += 1) {
    const win = index === 5;
    rolas.push({
      id: uuid(serial),
      sessionId: streakSession,
      athleteId: options.userId,
      athleteName: options.userName,
      partnerUserId: partner.id,
      partnerName: partner.name,
      occurredOn: options.today,
      modality: "nogi",
      federationId,
      durationMinutes: 6,
      result: win ? "vitoria" : "derrota",
      pointsAthlete: win ? 2 : 0,
      pointsPartner: win ? 0 : 2,
      advantagesAthlete: 0,
      advantagesPartner: 0,
      penaltiesAthlete: 0,
      penaltiesPartner: 0,
      actions: [],
    });
    serial += 1;
  }

  return { sessions, rolas };
}

export function buildIncomingFromPartner(today: string): SampleBundle {
  const federationId = defaultFederation().id;
  const dates = [addDays(today, -12), addDays(today, -6), addDays(today, -2)];
  const blueprints: Array<Omit<StoredRola, "id" | "sessionId" | "occurredOn" | "federationId" | "modality" | "athleteId" | "athleteName" | "partnerUserId" | "partnerName">> = [
    {
      durationMinutes: 6,
      result: "vitoria",
      pointsAthlete: 2,
      pointsPartner: 0,
      advantagesAthlete: 1,
      advantagesPartner: 0,
      penaltiesAthlete: 0,
      penaltiesPartner: 0,
      actions: [
        { techniqueId: "heel-hook", performer: "self", actionType: "finalizacao" },
        { techniqueId: "ashi-garami", performer: "self", actionType: "tecnica" },
      ],
    },
    {
      durationMinutes: 6,
      result: "derrota",
      pointsAthlete: 2,
      pointsPartner: 6,
      advantagesAthlete: 0,
      advantagesPartner: 1,
      penaltiesAthlete: 0,
      penaltiesPartner: 0,
      actions: [
        { techniqueId: "passagem-toreando", performer: "partner", actionType: "tecnica" },
        { techniqueId: "joelho-na-barriga", performer: "partner", actionType: "tecnica" },
      ],
    },
    {
      durationMinutes: 8,
      result: "empate",
      pointsAthlete: 2,
      pointsPartner: 2,
      advantagesAthlete: 0,
      advantagesPartner: 0,
      penaltiesAthlete: 0,
      penaltiesPartner: 0,
      actions: [{ techniqueId: "raspagem-borboleta", performer: "self", actionType: "tecnica" }],
    },
  ];

  const sessions: StoredSession[] = [];
  const rolas: StoredRola[] = [];
  dates.forEach((date, index) => {
    const sessionId = uuid(9000 + index);
    const rolaId = uuid(9100 + index);
    sessions.push({
      id: sessionId,
      userId: DEMO_ANA_ID,
      date,
      modality: "nogi",
      notes: "",
      federationId,
    });
    rolas.push({
      id: rolaId,
      sessionId,
      athleteId: DEMO_ANA_ID,
      athleteName: "Ana Souza",
      partnerUserId: DEMO_ROBERTO_ID,
      partnerName: "Roberto Almeida",
      occurredOn: date,
      modality: "nogi",
      federationId,
      ...blueprints[index]!,
    });
  });
  return { sessions, rolas };
}
