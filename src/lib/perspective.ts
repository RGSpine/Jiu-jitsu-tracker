import type {
  PerspectiveRola,
  Result,
  RolaAction,
  RolaDraft,
  StoredRola,
  Technique,
  TechniqueRef,
} from "@/lib/types";

export function invertResult(result: Result): Result {
  if (result === "vitoria") return "derrota";
  if (result === "derrota") return "vitoria";
  return result;
}

function refsFor(
  actions: RolaAction[],
  performer: RolaAction["performer"],
  actionType: RolaAction["actionType"],
  catalog: Map<string, Technique>,
): TechniqueRef[] {
  return actions
    .filter((action) => action.performer === performer && action.actionType === actionType)
    .map((action) => {
      const technique = catalog.get(action.techniqueId);
      return technique
        ? { id: technique.id, name: technique.name, category: technique.category }
        : null;
    })
    .filter((item): item is TechniqueRef => item !== null);
}

export function toPerspective(
  rola: StoredRola,
  myId: string,
  catalog: Technique[],
): PerspectiveRola | null {
  const mine = rola.athleteId === myId;
  const partner = rola.partnerUserId === myId;
  if (!mine && !partner) return null;

  const byId = new Map(catalog.map((item) => [item.id, item]));
  const myPerformer = mine ? "self" : "partner";
  const theirPerformer = mine ? "partner" : "self";

  return {
    id: rola.id,
    sessionId: rola.sessionId,
    occurredOn: rola.occurredOn,
    modality: rola.modality,
    federationId: rola.federationId,
    durationMinutes: rola.durationMinutes,
    ownedByMe: mine,
    athleteName: rola.athleteName,
    opponentName: mine ? rola.partnerName : rola.athleteName,
    opponentUserId: mine ? rola.partnerUserId : rola.athleteId,
    result: mine ? rola.result : invertResult(rola.result),
    pointsFor: mine ? rola.pointsAthlete : rola.pointsPartner,
    pointsAgainst: mine ? rola.pointsPartner : rola.pointsAthlete,
    advantagesFor: mine ? rola.advantagesAthlete : rola.advantagesPartner,
    advantagesAgainst: mine ? rola.advantagesPartner : rola.advantagesAthlete,
    penaltiesFor: mine ? rola.penaltiesAthlete : rola.penaltiesPartner,
    penaltiesAgainst: mine ? rola.penaltiesPartner : rola.penaltiesAthlete,
    submissionsApplied: refsFor(rola.actions, myPerformer, "finalizacao", byId),
    submissionsSuffered: refsFor(rola.actions, theirPerformer, "finalizacao", byId),
    techniquesUsed: refsFor(rola.actions, myPerformer, "tecnica", byId),
    simulation: Boolean(rola.simulation),
    startedStanding: Boolean(rola.startedStanding),
  };
}

export function actionsFromDraft(draft: RolaDraft): RolaAction[] {
  const actions: RolaAction[] = [];
  for (const techniqueId of draft.techniquesUsed) {
    actions.push({ techniqueId, performer: "self", actionType: "tecnica" });
  }
  for (const techniqueId of draft.submissionsApplied) {
    actions.push({ techniqueId, performer: "self", actionType: "finalizacao" });
  }
  for (const techniqueId of draft.submissionsSuffered) {
    actions.push({ techniqueId, performer: "partner", actionType: "finalizacao" });
  }
  return actions;
}

export function draftFromRola(rola: StoredRola): RolaDraft {
  const ids = (performer: RolaAction["performer"], actionType: RolaAction["actionType"]) =>
    rola.actions
      .filter((action) => action.performer === performer && action.actionType === actionType)
      .map((action) => action.techniqueId);

  return {
    localId: rola.id,
    durationMinutes: rola.durationMinutes,
    partnerUserId: rola.partnerUserId,
    partnerName: rola.partnerName,
    result: rola.result,
    pointsFor: rola.pointsAthlete,
    pointsAgainst: rola.pointsPartner,
    advantagesFor: rola.advantagesAthlete,
    advantagesAgainst: rola.advantagesPartner,
    penaltiesFor: rola.penaltiesAthlete,
    penaltiesAgainst: rola.penaltiesPartner,
    techniquesUsed: ids("self", "tecnica"),
    submissionsApplied: ids("self", "finalizacao"),
    submissionsSuffered: ids("partner", "finalizacao"),
    simulation: Boolean(rola.simulation),
    startedStanding: Boolean(rola.startedStanding),
  };
}
