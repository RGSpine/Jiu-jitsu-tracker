import { defaultFederation } from "@/data/rules";
import type { Modality, RolaDraft, SessionDraft } from "@/lib/types";

export function createId(): string {
  return crypto.randomUUID();
}

export function emptyRola(): RolaDraft {
  return {
    localId: createId(),
    durationMinutes: 6,
    partnerUserId: null,
    partnerName: "",
    result: "sem_resultado",
    pointsFor: 0,
    pointsAgainst: 0,
    advantagesFor: 0,
    advantagesAgainst: 0,
    penaltiesFor: 0,
    penaltiesAgainst: 0,
    submissionsApplied: [],
    submissionsSuffered: [],
    techniquesUsed: [],
  };
}

export function emptyDraft(date: string, modality: Modality = "nogi"): SessionDraft {
  return {
    date,
    modality,
    notes: "",
    federationId: defaultFederation().id,
    rolas: [emptyRola()],
  };
}
