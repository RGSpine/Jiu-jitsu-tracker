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
  belt: Belt | null;
  stripes: number;
  academy: string;
  preferredModality: Modality;
  /** O parceiro vê nível e título só se isto estiver ligado. */
  shareProgress?: boolean;
  equippedTitleId?: string | null;
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
