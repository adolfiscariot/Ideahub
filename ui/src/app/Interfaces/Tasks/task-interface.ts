export interface TaskDetails {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  labels: string;
  isCompleted: boolean;
  taskAssignees: string[];
  projectId: number;
  mediaCount: number;
  subTasks: SubTaskDetails[];
}

export interface SubTaskDetails {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  subTaskAssignees: string[];
  projectTaskId: number;
  parentSubTaskId?: number;
  mediaCount: number;
}

export interface TaskDto {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  labels: string;
  taskAssignees: string[];
}

export interface TaskUpdateDto {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  labels?: string;
  isCompleted?: boolean;
  taskAssignees?: string[];
}

export interface SubTaskDto {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  subTaskAssignees: string[];
  parentSubTaskId?: number;
}

export interface SubTaskUpdateDto {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCompleted?: boolean;
  subTaskAssignees?: string[];
}
