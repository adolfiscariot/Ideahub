export interface Idea {
  id: string;
  Title: string;
  ProblemStatement: string;
  ProposedSolution: string;
  StrategicAlignment?: string;
  UseCase: string;
  InnovationCategory: string;
  SubCategory?: string;
  TechnologyInvolved?: string;
  Notes?: string;
  Score?: number;
  //filter: string[];
  isPromotedToProject: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  UserId: string;
  userId?: string;
  isReadyForPromotion?: boolean;
  mediaCount: number;
  projectId?: number;

  groupId: string;
  userName?: string;
  voteCount?: number;
  commentCount?: number;
  userVoted?: boolean;
  userVoteId?: string;

  groupName?: string;
  name?: string;
  AiReasoning?: string;
  // DTO fields from open-idea (camelCase)
  author?: string;
  title?: string;
  problemStatement?: string;
  proposedSolution?: string;
  strategicAlignment?: string;
  useCase?: string;
  innovationCategory?: string;
  subCategory?: string;
  technologyInvolved?: string;
  notes?: string;
  score?: number;
}

export interface CreateIdeaRequest {
  Title: string;
  ProblemStatement: string;
  ProposedSolution: string;
  StrategicAlignment: string;
  UseCase: string;
  InnovationCategory: string;
  SubCategory?: string;
  TechnologyInvolved?: string;
  Notes?: string;
  groupId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface VoteRequest {
  ideaId: string;
  groupId: string;
}

export interface UnvoteRequest {
  voteId: string;
}

export interface SeeVotesRequest {
  ideaId: string;
}

export interface VoteDetails {
  userName: string;
  userEmail: string;
  userId: string;
  ideaId: number;
  isDeleted: boolean;
  voteId: number;
  time: string;
}

export interface PromoteRequest {
  ideaId: string;
  groupId: string;
}

export interface IdeaUpdate {
  Title?: string;
  ProposedSolution?: string;
  ProblemStatement?: string;
  Status?: string;
  StrategicAlignment?: string;
  UseCase?: string;
  InnovationCategory?: string;
  SubCategory?: string;
  TechnologyInvolved?: string;
  Notes?: string;
  Score?: number;
}

export interface VoteResponse {
  id?: string;
  ideaId?: string;
  userId?: string;
  createdAt?: Date;
}

export interface createComment {
  content: string,
}

export interface viewComment {
  id: number,
  content: string,
  createdAt: string,
  userId?: string,
  ideaId?: number,
  mediaCount?: number,
  mediaItems?: any[];
}

export enum ImpactScope {
  Unknown = 'Unknown',
  Department = 'Department',
  OrganizationWide = 'OrganizationWide',
  External = 'External',
}

export enum RiskLevel {
  Unknown = 'Unknown',
  Low = 'Low',
  Medium = 'Medium',
  High = 'High'
}

export enum EvaluationStatus {
  Unknown = 'Unknown',
  FeasibilityResearch = 'FeasibilityResearch',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export enum ResponsibleDepartment {
  Unknown = 'Unknown',
  Finance = 'Finance',
  IT = 'IT',
  Operations = 'Operations',
  MarketingAndSales = 'MarketingAndSales',
  StrategyAndCompliance = 'StrategyAndCompliance'
}

export enum ActionStep {
  Unknown = 'Unknown',
  PrototypeDevelopment = 'PrototypeDevelopment',
  StakeholderReview = 'StakeholderReview',
  PilotLaunch = 'PilotLaunch',
  MarketFeasibilityStudy = 'MarketFeasibilityStudy',
  RolloutPlanning = 'RolloutPlanning'
}

export enum BusinessCaseResult {
  Unknown = 'Unknown',
  InProgress = 'InProgress',
  PilotStage = 'PilotStage',
  AwaitingResults = 'AwaitingResults'
}

export enum Verdict {
  Unknown = 'Unknown',
  Approved = 'Approved',
  AwaitingReview = 'AwaitingReview',
  Park = 'Park'
}

export enum ScoringStage {
  Evaluation = 'Evaluation',
  BusinessCase = 'BusinessCase',
  ScoringDimensions = 'ScoringDimensions',
  Completed = 'Completed'
}

// Phase 3 Scoring Enums
export enum StrategicAlignmentScore {
  Unknown = 'Unknown',
  NoAlignment = 'NoAlignment',
  Low = 'Low',
  Moderate = 'Moderate',
  Strong = 'Strong',
  Full = 'Full'
}

export enum CustomerImpactScore {
  Unknown = 'Unknown',
  Minimal = 'Minimal',
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
  Transformational = 'Transformational'
}

export enum FinancialBenefitScore {
  Unknown = 'Unknown',
  NoGain = 'NoGain',
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
  Breakthrough = 'Breakthrough'
}

export enum FeasibilityScore {
  Unknown = 'Unknown',
  VeryDifficult = 'VeryDifficult',
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
  VeryFeasible = 'VeryFeasible'
}

export enum TimeToValueScore {
  Unknown = 'Unknown',
  Over24Months = 'Over24Months',
  TwelveToTwentyFour = 'TwelveToTwentyFour',
  SixToTwelve = 'SixToTwelve',
  ThreeToSix = 'ThreeToSix',
  UnderThreeMonths = 'UnderThreeMonths'
}

export enum CostScore {
  Unknown = 'Unknown',
  VeryHigh = 'VeryHigh',
  High = 'High',
  Moderate = 'Moderate',
  Low = 'Low',
  VeryLow = 'VeryLow'
}

export enum EffortScore {
  Unknown = 'Unknown',
  VeryHigh = 'VeryHigh',
  High = 'High',
  Moderate = 'Moderate',
  Low = 'Low',
  VeryLow = 'VeryLow'
}

export enum RiskScore {
  Unknown = 'Unknown',
  VeryHigh = 'VeryHigh',
  High = 'High',
  Moderate = 'Moderate',
  Low = 'Low',
  VeryLow = 'VeryLow'
}

export enum ScalabilityScore {
  Unknown = 'Unknown',
  NotScalable = 'NotScalable',
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
  FullyScalable = 'FullyScalable'
}

export enum DifferentiationScore {
  Unknown = 'Unknown',
  NoDifferentiation = 'NoDifferentiation',
  LowUniqueness = 'LowUniqueness',
  ModerateUniqueness = 'ModerateUniqueness',
  HighDifferentiation = 'HighDifferentiation',
  UniqueStrongIP = 'UniqueStrongIP'
}

export enum SustainabilityScore {
  Unknown = 'Unknown',
  NegativeImpact = 'NegativeImpact',
  MinimalBenefit = 'MinimalBenefit',
  ModerateBenefit = 'ModerateBenefit',
  StrongBenefit = 'StrongBenefit',
  MajorBenefit = 'MajorBenefit'
}

export enum ConfidenceScore {
  Unknown = 'Unknown',
  VeryLow = 'VeryLow',
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
  VeryHigh = 'VeryHigh'
}

// Scoring DTOs
export interface BusinessCaseDto {
  ExpectedBenefits: string;
  ImpactScope: ImpactScope;
  RiskLevel: RiskLevel;
  EvaluationStatus: EvaluationStatus;
  OwnerDepartment: ResponsibleDepartment;
  NextSteps: ActionStep;
  DecisionDate: string; // ISO Date
  PlannedDurationWeeks: number;
  CurrentStage: BusinessCaseResult;
  Verdict: Verdict;
}

export interface ScoringDimensionsDto {
  StrategicAlignment: StrategicAlignmentScore;
  CustomerImpact: CustomerImpactScore;
  FinancialBenefit: FinancialBenefitScore;
  Feasibility: FeasibilityScore;
  TimeToValue: TimeToValueScore;
  Cost: CostScore;
  Effort: EffortScore;
  Risk: RiskScore;
  Scalability: ScalabilityScore;
  Differentiation: DifferentiationScore;
  SustainabilityImpact: SustainabilityScore;
  ProjectConfidence: ConfidenceScore;
  Score: number;
  ReviewerComments: string;
}