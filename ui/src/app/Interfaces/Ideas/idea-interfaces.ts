export interface Idea {
  id: string;
  title: string;
  description: string;
  isPromotedToProject: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  userId: string;
  groupId: string;
  userName?: string;
  voteCount?: number;
  commentCount?: number;
  userVoted?: boolean;
}

export interface CreateIdeaRequest {
  title: string;
  description: string;
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

export interface PromoteRequest {
  ideaId: string;
  groupId: string;
}