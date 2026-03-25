import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { TaskDetails, TaskDto, TaskUpdateDto, SubTaskDto, SubTaskUpdateDto, SubTaskDetails } from '../Interfaces/Tasks/task-interface';
import { ApiResponse } from '../Interfaces/Projects/project-interface';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly apiUrl = `${environment.apiUrl}/task`;
  private http = inject(HttpClient);

  private convertResponse<T>(response: any): ApiResponse<T> {
    return {
      success: response.status || false,
      message: response.message || '',
      data: response.data
    };
  }

  // TASK ENDPOINTS
  getProjectTasks(projectId: number): Observable<ApiResponse<TaskDetails[]>> {
    return this.http.get<any>(`${this.apiUrl}/get-tasks/${projectId}`).pipe(
      map(response => this.convertResponse<TaskDetails[]>(response))
    );
  }

  createTask(projectId: number, taskDto: TaskDto): Observable<ApiResponse<TaskDetails>> {
    return this.http.post<any>(`${this.apiUrl}/create/${projectId}`, taskDto).pipe(
      map(response => this.convertResponse<TaskDetails>(response))
    );
  }

  updateTask(taskId: number, taskDto: TaskUpdateDto): Observable<ApiResponse<any>> {
    return this.http.put<any>(`${this.apiUrl}/update-task/${taskId}`, taskDto).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  deleteTask(taskId: number): Observable<ApiResponse<any>> {
    return this.http.delete<any>(`${this.apiUrl}/delete-task/${taskId}`).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // SUBTASK ENDPOINTS
  createSubTask(taskId: number, subTaskDto: SubTaskDto): Observable<ApiResponse<SubTaskDetails>> {
    return this.http.post<any>(`${this.apiUrl}/create-subtask/${taskId}`, subTaskDto).pipe(
      map(response => this.convertResponse<SubTaskDetails>(response))
    );
  }

  updateSubTask(subTaskId: number, subTaskDto: SubTaskUpdateDto): Observable<ApiResponse<any>> {
    return this.http.put<any>(`${this.apiUrl}/update-subtask/${subTaskId}`, subTaskDto).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  deleteSubTask(subTaskId: number): Observable<ApiResponse<any>> {
    return this.http.delete<any>(`${this.apiUrl}/delete-subtask/${subTaskId}`).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }
}
