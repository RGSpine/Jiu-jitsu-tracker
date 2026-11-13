export type Modality = "gi" | "nogi";

export type Result = "vitoria" | "derrota" | "empate" | "sem_resultado";

export type Belt =
  | "branca"
  | "azul"
  | "roxa"
  | "marrom"
  | "preta"
  | "coral"
  | "vermelha";

export type Category =
  | "queda"
  | "raspagem"
  | "passagem"
  | "finalizacao"
  | "controle"
  | "escape";

export type TechniqueModality = Modality | "both";

export type Performer = "self" | "partner";

export type ActionType = "tecnica" | "finalizacao";

export type Technique = {
  id: string;
  name: string;
  category: Category;
  modality: TechniqueModality;
  scoringCode: string | null;
  aliases: string[];
};

export type Federation = {
  id: string;
  name: string;
  isDefault: boolean;
};

export type ScoringRule = {
  federationId: string;
  code: string;
  label: string;
  points: number;
};

export type Profile = {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  belt: Belt | null;
  stripes: number;
  academy: string;
  preferredModality: Modality;
  /** O parceiro e a equipe veem nível, título e presença só se isto estiver ligado. */
  shareProgress?: boolean;
  discoverable?: boolean;
  isCompetitor?: boolean;
  primaryTeamId?: string | null;
  equippedTitleId?: string | null;
  equippedEpithetId?: string | null;
};

export type RolaAction = {
  techniqueId: string;
  performer: Performer;
  actionType: ActionType;
};

export type StoredSession = {
  id: string;
  userId: string;
  date: string;
  modality: Modality;
  notes: string;
  federationId: string;
};

export type StoredRola = {
  id: string;
  sessionId: string;
  athleteId: string;
  athleteName: string;
  partnerUserId: string | null;
  partnerName: string;
  occurredOn: string;
  modality: Modality;
  federationId: string;
  durationMinutes: number;
  result: Result;
  pointsAthlete: number;
  pointsPartner: number;
  advantagesAthlete: number;
  advantagesPartner: number;
  penaltiesAthlete: number;
  penaltiesPartner: number;
  actions: RolaAction[];
  simulation?: boolean;
  startedStanding?: boolean;
};

export type RolaDraft = {
  localId: string;
  durationMinutes: number;
  partnerUserId: string | null;
  partnerName: string;
  result: Result;
  pointsFor: number;
  pointsAgainst: number;
  advantagesFor: number;
  advantagesAgainst: number;
  penaltiesFor: number;
  penaltiesAgainst: number;
  submissionsApplied: string[];
  submissionsSuffered: string[];
  techniquesUsed: string[];
  simulation?: boolean;
  startedStanding?: boolean;
};

export type SessionDraft = {
  id?: string;
  date: string;
  modality: Modality;
  notes: string;
  federationId: string;
  rolas: RolaDraft[];
};

export type TechniqueRef = {
  id: string;
  name: string;
  category: Category;
};

export type PerspectiveRola = {
  id: string;
  sessionId: string;
  occurredOn: string;
  modality: Modality;
  federationId: string;
  durationMinutes: number;
  ownedByMe: boolean;
  athleteName: string;
  opponentName: string;
  opponentUserId: string | null;
  result: Result;
  pointsFor: number;
  pointsAgainst: number;
  advantagesFor: number;
  advantagesAgainst: number;
  penaltiesFor: number;
  penaltiesAgainst: number;
  submissionsApplied: TechniqueRef[];
  submissionsSuffered: TechniqueRef[];
  techniquesUsed: TechniqueRef[];
  simulation?: boolean;
  startedStanding?: boolean;
};

export type Organization = "ibjjf" | "cbjj" | "adcc" | "ajp" | "outro";
export type AgeDivision = "juvenil" | "adulto" | "master";
export type Placement = "ouro" | "prata" | "bronze" | "participacao";
export type CompetitionStatus = "planned" | "done";
export type MatchStage = "oitavas" | "quartas" | "semi" | "final" | "absoluto" | "outro";
export type MatchResult = "vitoria" | "derrota" | "empate";
export type MatchMethod = "finalizacao" | "pontos" | "vantagens" | "punicao" | "decisao" | "dq" | "wo";
export type TeamRole = "owner" | "admin" | "member";
export type MemberStatus = "invited" | "requested" | "active";

export type Team = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
};

export type TeamMember = {
  teamId: string;
  userId: string;
  role: TeamRole;
  status: MemberStatus;
  joinedAt: string;
};

export type Competition = {
  id: string;
  userId: string;
  name: string;
  organization: Organization;
  date: string;
  city: string;
  modality: Modality;
  belt: Belt | null;
  ageDivision: AgeDivision;
  weightClass: string;
  absolute: boolean;
  absolutePlacement: Placement | null;
  status: CompetitionStatus;
  placement: Placement | null;
  notes: string;
};

export type CompetitionMatch = {
  id: string;
  competitionId: string;
  order: number;
  stage: MatchStage;
  opponentName: string;
  result: MatchResult;
  method: MatchMethod;
  techniqueId: string | null;
  pointsFor: number;
  pointsAgainst: number;
  advantagesFor: number;
  advantagesAgainst: number;
  penaltiesFor: number;
  penaltiesAgainst: number;
  durationSeconds: number;
  notes: string;
};

export type PrepPlan = {
  id: string;
  competitionId: string;
  userId: string;
  startDate: string;
  weeklyTrainingTarget: number;
  weeklyRolaTarget: number;
  focusAttributes: string[];
  targetWeightKg: number | null;
  currentWeightKg: number | null;
  active: boolean;
};

export type DiscoverHit = {
  id: string;
  username: string;
  displayName: string;
  belt: Belt | null;
  academy: string;
};

export type PartnerHit = {
  id: string;
  displayName: string;
  belt: Belt | null;
  academy: string;
  preferredModality: Modality;
};

export type SessionSummary = {
  id: string;
  date: string;
  modality: Modality;
  notes: string;
  federationId: string;
  rolas: PerspectiveRola[];
};

export type PeriodKey = "semana" | "mes" | "semestre" | "ano" | "tudo";

export type ModalityFilter = "todas" | Modality;
