import { Media } from '../Media/media-interface';

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
  aiReasoning?: string;
  currentStage?: ScoringStage | number | string;
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
  id?: string;
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

  // backend mapping
  title?: string;
  proposedSolution?: string;
  problemStatement?: string;
  status?: string;
  strategicAlignment?: string;
  useCase?: string;
  innovationCategory?: string;
  subCategory?: string;
  technologyInvolved?: string;
  notes?: string;
  score?: number;
}

export interface VoteResponse {
  id?: string;
  ideaId?: string;
  userId?: string;
  createdAt?: Date;
}

export interface createComment {
  content: string;
}

export interface viewComment {
  id: number;
  content: string;
  createdAt: string;
  userId?: string;
  ideaId?: number;
  mediaCount?: number;
  mediaItems?: Media[];
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
  High = 'High',
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
  StrategyAndCompliance = 'StrategyAndCompliance',
}

export enum ActionStep {
  Unknown = 'Unknown',
  PrototypeDevelopment = 'PrototypeDevelopment',
  StakeholderReview = 'StakeholderReview',
  PilotLaunch = 'PilotLaunch',
  MarketFeasibilityStudy = 'MarketFeasibilityStudy',
  RolloutPlanning = 'RolloutPlanning',
}

export enum BusinessCaseResult {
  Unknown = 'Unknown',
  InProgress = 'InProgress',
  PilotStage = 'PilotStage',
  AwaitingResults = 'AwaitingResults',
}

export enum Verdict {
  Unknown = 'Unknown',
  Approved = 'Approved',
  AwaitingReview = 'AwaitingReview',
  Park = 'Park',
}

export enum ScoringStage {
  Evaluation = 'Evaluation',
  BusinessCase = 'BusinessCase',
  ScoringDimensions = 'ScoringDimensions',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
}

// Phase 3 Scoring Enums
export enum StrategicAlignmentScore {
  Unknown = 'Unknown',
  Low = 'Low',
  Moderate = 'Moderate',
  Strong = 'Strong',
}

export enum CustomerImpactScore {
  Unknown = 'Unknown',
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
}

export enum FinancialBenefitScore {
  Unknown = 'Unknown',
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
}

export enum FeasibilityScore {
  Unknown = 'Unknown',
  VeryDifficult = 'VeryDifficult',
  Moderate = 'Moderate',
  High = 'High',
}

export enum TimeToValueScore {
  Unknown = 'Unknown',
  SixToTwelve = 'SixToTwelve',
  ThreeToSix = 'ThreeToSix',
  UnderThreeMonths = 'UnderThreeMonths',
}

export enum CostScore {
  Unknown = 'Unknown',
  High = 'High',
  Moderate = 'Moderate',
  Low = 'Low',
}

export enum EffortScore {
  Unknown = 'Unknown',
  High = 'High',
  Moderate = 'Moderate',
  Low = 'Low',
}

export enum RiskScore {
  Unknown = 'Unknown',
  High = 'High',
  Moderate = 'Moderate',
  Low = 'Low',
}

export enum ScalabilityScore {
  Unknown = 'Unknown',
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
}

export enum DifferentiationScore {
  Unknown = 'Unknown',
  LowUniqueness = 'LowUniqueness',
  ModerateUniqueness = 'ModerateUniqueness',
  HighDifferentiation = 'HighDifferentiation',
}

export enum SustainabilityScore {
  Unknown = 'Unknown',
  MinimalBenefit = 'MinimalBenefit',
  ModerateBenefit = 'ModerateBenefit',
  StrongBenefit = 'StrongBenefit',
}

export enum ConfidenceScore {
  Unknown = 'Unknown',
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
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
