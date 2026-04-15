export enum ProjectStatus {
  Planning = 0,
  Active = 1,
  Completed = 2,
  Shelved = 3,
  Cancelled = 4
}

export interface Project {
  id: number;
  title: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt?: string;
  endedAt?: string;
  createdByUserId?: string;
  overseenBy: string;
  overseenById: string;
  overseenByUserId?: string;
  groupName?: string;
  ideaTitle?: string;
  ideaId?: string;
  groupId?: string;
  progress: number;
}

export interface CreateProjectRequest {
  title: string;
  description: string;
  overseenByEmail: string;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  overseenByUserEmail?: string;
  status?: string | ProjectStatus;
  endedAt?: string | null;
}

export type ProjectDetails = Project;

export interface ProjectSummary {
  id: number;
  title: string;
  description: string;
  overseenByUserName: string;
  status: string;
  ideaName: string;
  groupName: string;
}

export interface ProjectBackendDto {
  id: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  endedAt?: string;
  overseenByUserName: string;
  overseenByUserId: string;
  groupName: string;
  ideaName: string;
  progress?: number;
}