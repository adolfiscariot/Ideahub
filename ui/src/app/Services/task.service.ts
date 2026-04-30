import { AppConfigService } from '../core/services/app-config.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  TaskDetails,
  TaskDto,
  TaskUpdateDto,
  SubTaskDto,
  SubTaskUpdateDto,
  SubTaskDetails,
} from '../Interfaces/Tasks/task-interface';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private appConfig = inject(AppConfigService);
  private get apiUrl() { return `${this.appConfig.apiUrl}/task`; }
  private http = inject(HttpClient);

  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data,
    };
  }

  // TASK ENDPOINTS
  getProjectTasks(projectId: number): Observable<ApiResponse<TaskDetails[]>> {
    return this.http
      .get<ApiResponse<TaskDetails[]>>(`${this.apiUrl}/get-tasks/${projectId}`)
      .pipe(map((response) => this.convertResponse<TaskDetails[]>(response)));
  }

  createTask(
    projectId: number,
    taskDto: TaskDto,
  ): Observable<ApiResponse<TaskDetails>> {
    return this.http
      .post<
        ApiResponse<TaskDetails>
      >(`${this.apiUrl}/create/${projectId}`, taskDto)
      .pipe(map((response) => this.convertResponse<TaskDetails>(response)));
  }

  updateTask(
    taskId: number,
    taskDto: TaskUpdateDto,
  ): Observable<ApiResponse<void>> {
    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/update-task/${taskId}`, taskDto)
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  deleteTask(taskId: number): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/delete-task/${taskId}`)
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  // SUBTASK ENDPOINTS
  createSubTask(
    taskId: number,
    subTaskDto: SubTaskDto,
  ): Observable<ApiResponse<SubTaskDetails>> {
    return this.http
      .post<
        ApiResponse<SubTaskDetails>
      >(`${this.apiUrl}/create-subtask/${taskId}`, subTaskDto)
      .pipe(map((response) => this.convertResponse<SubTaskDetails>(response)));
  }

  updateSubTask(
    subTaskId: number,
    subTaskDto: SubTaskUpdateDto,
  ): Observable<ApiResponse<void>> {
    return this.http
      .put<
        ApiResponse<void>
      >(`${this.apiUrl}/update-subtask/${subTaskId}`, subTaskDto)
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  deleteSubTask(subTaskId: number): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/delete-subtask/${subTaskId}`)
      .pipe(map((response) => this.convertResponse<void>(response)));
  }
}
