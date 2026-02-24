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
  score?: number;
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