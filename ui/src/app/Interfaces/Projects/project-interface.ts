export interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  createdByUserId: string;
  overseenByUserId: string;
  overseenByUserName?: string;
  ideaId: string;
  ideaName?: string;
  groupId: string;
  groupName?: string;
  createdAt: Date;
  updatedAt?: Date;
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
  status?: string;
}

export interface ProjectDetails {
  title: string;
  description: string;
  status: string;
  overseenByUserName: string;
  ideaName?: string;
  groupName?: string;
}

export interface ProjectSummary {
  title: string;
  description: string;
  overseenByUserName: string;
  status: string;
  ideaName: string;
  groupName: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}