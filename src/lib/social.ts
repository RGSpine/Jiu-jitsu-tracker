import {
  activePlan,
  assessCampaign,
  campaignMessages,
  competitionBonusXp,
  competitionHonors,
  competitionReport,
  focusScore,
  honorLog,
  matchMinutesFor,
  nextCompetition,
  phaseLabel,
  type CampaignAssessment,
  type CampaignRola,
  type CompetitionReport,
} from "@/lib/competition";
import { buildProgress, type ProgressRola, type SystemLogEntry } from "@/lib/progression";
import { daysBetween } from "@/lib/dates";
import { TEAM_QUEST_XP, fundadorUnlocked, teamQuestEvent } from "@/lib/teams";
import type { AttributeId } from "@/lib/progression";
import type { Competition, CompetitionMatch, PrepPlan, TeamMember } from "@/lib/types";

export type SocialRola = ProgressRola & {
  simulation?: boolean;
  startedStanding?: boolean;
};

export type SocialSnapshot = {
  log: SystemLogEntry[];
  bonusXp: number;
  titles: { id: string; title: string }[];
  banner: { name: string; days: number; phaseLabel: string } | null;
  assessment: CampaignAssessment | null;
  report: CompetitionReport;
  next: { id: string; name: string; date: string; days: number; city: string; modality: Competition["modality"] } | null;
  competitions: Competition[];
  matches: CompetitionMatch[];
};

export function socialSnapshot(input: {
  today: string;
  userId: string;
  teams: { id: string; name: string; ownerId: string; createdAt: string; members: Pick<TeamMember, "userId" | "status">[] }[];
  questTotals: { teamId: string; name: string; total: number }[];
  competitions: Competition[];
  matches: CompetitionMatch[];
  plans: PrepPlan[];
  rolas: SocialRola[];
  trainingDates: string[];
}): SocialSnapshot {
  const mine = input.competitions.filter((item) => item.userId === input.userId);
  const mineMatches = input.matches.filter((match) => mine.some((item) => item.id === match.competitionId));
  const ownedTeams = input.teams.filter((team) => team.members.some((member) => member.userId === input.userId && member.status === "active"));
  const founded = fundadorUnlocked(ownedTeams, input.userId);
  const foundedOn = ownedTeams.find((team) => team.ownerId === input.userId)?.createdAt ?? input.today;
  const honors = competitionHonors({ competitions: mine, matches: mineMatches, founded, foundedOn });
  const subs = input.rolas.reduce((sum, rola) => sum + rola.submissionsApplied.length, 0);
  const report = competitionReport(mine, mineMatches, {
    rolas: input.rolas.length,
    submissionRate: input.rolas.length ? subs / input.rolas.length : 0,
  });
  const upcoming = nextCompetition(mine, input.today);
  const current = activePlan(input.plans.filter((plan) => plan.userId === input.userId), mine, input.today);
  const campaignRolas = toCampaign(input.rolas);
  const assessment = current
    ? assessCampaign({
        today: input.today,
        startDate: current.plan.startDate,
        eventDate: current.competition.date,
        weeklyTrainingTarget: current.plan.weeklyTrainingTarget,
        weeklyRolaTarget: current.plan.weeklyRolaTarget,
        trainingDates: input.trainingDates,
        rolas: campaignRolas,
        matchMinutes: matchMinutesFor(current.competition.belt, current.competition.ageDivision),
        focusScore: attributeFocus(input.rolas, current.plan.focusAttributes, current.plan.startDate, input.today),
        targetWeightKg: current.plan.targetWeightKg,
        currentWeightKg: current.plan.currentWeightKg,
      })
    : null;
  const messages = current
    ? campaignMessages({
        planId: current.plan.id,
        name: current.competition.name,
        startDate: current.plan.startDate,
        eventDate: current.competition.date,
        today: input.today,
        adherence: assessment?.adherence ?? 0,
        active: current.plan.active,
      })
    : [];
  const quests = input.questTotals
    .map((quest) => teamQuestEvent(quest.teamId, quest.name, input.today, quest.total))
    .filter((entry): entry is SystemLogEntry => entry !== null);
  const phaseLog: SystemLogEntry[] = assessment && current && assessment.quest.done && assessment.quest.reward > 0
    ? [{
        id: `campanha-missao:${current.plan.id}:${assessment.quest.id}`,
        kind: "campanha",
        occurredOn: input.today,
        body: `[SISTEMA] ${assessment.quest.text.replace(/\.$/, "")}`,
      }]
    : [];
  const xp = competitionBonusXp(mine.map((item) => ({
    id: item.id,
    date: item.date,
    status: item.status,
    placement: item.placement,
    wins: mineMatches.filter((match) => match.competitionId === item.id && match.result === "vitoria").length,
    matches: mineMatches.filter((match) => match.competitionId === item.id).length,
  })));
  const titles = [
    ...honors.map((honor) => ({ id: honor.id.replace("titulo:", ""), title: honor.title })),
    ...messages.filter((entry) => entry.id.startsWith("titulo:campanha-completa")).map((entry) => ({
      id: entry.id.replace("titulo:", ""),
      title: "Campanha completa",
    })),
  ];
  const bonusXp = xp.total + quests.length * TEAM_QUEST_XP + phaseLog.length * (assessment?.quest.reward ?? 0);
  return {
    log: [...honorLog(honors), ...messages, ...quests, ...phaseLog],
    bonusXp,
    titles,
    banner: assessment && current ? { name: current.competition.name, days: assessment.days, phaseLabel: phaseLabel(assessment.phase) } : null,
    assessment,
    report,
    next: upcoming && assessment && current && upcoming.id === current.competition.id
      ? { id: upcoming.id, name: upcoming.name, date: upcoming.date, days: assessment.days, city: upcoming.city, modality: upcoming.modality }
      : upcoming
        ? { id: upcoming.id, name: upcoming.name, date: upcoming.date, days: Math.max(0, daysBetween(input.today, upcoming.date)), city: upcoming.city, modality: upcoming.modality }
        : null,
    competitions: mine,
    matches: mineMatches,
  };
}

function toCampaign(rolas: SocialRola[]): CampaignRola[] {
  return rolas.map((rola) => ({
    occurredOn: rola.occurredOn,
    sessionId: rola.sessionId,
    durationMinutes: rola.durationMinutes,
    simulation: Boolean(rola.simulation),
    startedStanding: Boolean(rola.startedStanding),
    scored: rola.result === "vitoria" || rola.result === "derrota" || rola.result === "empate" || (rola.pointsFor + (rola.pointsAgainst ?? 0)) > 0,
    queda: rola.techniquesUsed.some((technique) => technique.category === "queda"),
  }));
}

function attributeFocus(rolas: SocialRola[], focus: string[], start: string, today: string): number {
  const ids = focus.filter((id): id is AttributeId => [
    "queda", "passagem", "raspagem", "guarda", "costas", "pes", "estrangulamento", "defesa", "pontuacao",
  ].includes(id));
  if (ids.length === 0) return 0;
  const before = buildProgress(rolas.filter((rola) => rola.occurredOn < start), start);
  const after = buildProgress(rolas, today);
  const earlier = ids.map((id) => before.attributes.find((item) => item.id === id)?.level ?? 0);
  const later = ids.map((id) => after.attributes.find((item) => item.id === id)?.level ?? 0);
  return focusScore(earlier, later);
}

export function emptyReport(): CompetitionReport {
  return competitionReport([], [], { rolas: 0, submissionRate: 0 });
}
