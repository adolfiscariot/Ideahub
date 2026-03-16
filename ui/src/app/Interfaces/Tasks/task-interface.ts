export interface TaskDetails {
    id: number;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    labels: string;
    isCompleted: boolean;
    assigneeIds: string[];
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
    assigneeIds: string[];
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
    assigneeIds: string[];
}

export interface TaskUpdateDto {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    labels?: string;
    isCompleted?: boolean;
    assigneeIds?: string[];
}

export interface SubTaskDto {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    assigneeIds: string[];
    parentSubTaskId?: number;
}

export interface SubTaskUpdateDto {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    isCompleted?: boolean;
    assigneeIds?: string[];
}
