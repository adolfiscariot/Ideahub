import { ApiResponse } from '../Projects/project-interface';

export interface TimesheetDto {
  id?: number;
  taskId: number;
  taskTitle?: string;
  userName?: string;
  workDate: string | Date;
  description: string;
  hoursSpent: number;
  comments?: string;
  hasBlocker: boolean;
  blockerDescription?: string;
  blockerSeverity?: BlockerSeverity;
  mediaCount?: number;
  userId?: string;
  createdAt?: Date | string;
}

export interface TimesheetDetails {
  id: number;
  taskId: number;
  userId: string;
  userName: string;
  workDate: string;
  description: string;
  hoursSpent: number;
  comments?: string;
  hasBlocker: boolean;
  blockerDescription?: string;
  blockerSeverity?: BlockerSeverity;
  createdAt: string;
}

export enum BlockerSeverity {
  Low = 0,
  Medium = 1,
  High = 2
}

export interface RelevantTask {
  id: number;
  title: string;
}
