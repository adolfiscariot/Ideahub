import { AppConfigService } from '../core/services/app-config.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import {
  TimesheetDto,
  TimesheetDetails,
  RelevantTask,
  InvalidTimesheetRow,
} from '../Interfaces/Timesheet/timesheet-interface';

@Injectable({
  providedIn: 'root',
})
export class TimesheetService {
  private appConfig = inject(AppConfigService);
  private get apiUrl() {
    return `${this.appConfig.apiUrl}/timesheet`;
  }
  private http = inject(HttpClient);

  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data,
    };
  }

  bulkLogWork(
    projectId: number,
    logs: TimesheetDto[],
  ): Observable<
    ApiResponse<{ createdIds: number[]; invalidRows: InvalidTimesheetRow[] }>
  > {
    return this.http
      .post<
        ApiResponse<{
          createdIds: number[];
          invalidRows: InvalidTimesheetRow[];
        }>
      >(`${this.apiUrl}/bulk-timesheets?projectId=${projectId}`, { logs })
      .pipe(
        map((response) =>
          this.convertResponse<{
            createdIds: number[];
            invalidRows: InvalidTimesheetRow[];
          }>(response),
        ),
      );
  }

  getRelevantTasks(projectId: number): Observable<ApiResponse<RelevantTask[]>> {
    return this.http
      .get<
        ApiResponse<RelevantTask[]>
      >(`${this.apiUrl}/relevant-tasks?projectId=${projectId}`)
      .pipe(map((response) => this.convertResponse<RelevantTask[]>(response)));
  }

  getMyLogs(projectId?: number): Observable<ApiResponse<TimesheetDto[]>> {
    const url = projectId
      ? `${this.apiUrl}/my-timesheets?projectId=${projectId}`
      : `${this.apiUrl}/my-timesheets`;
    return this.http
      .get<ApiResponse<TimesheetDto[]>>(url)
      .pipe(map((response) => this.convertResponse<TimesheetDto[]>(response)));
  }

  getProjectTeam(
    projectId: number,
  ): Observable<ApiResponse<{ id: string; name: string }[]>> {
    return this.http
      .get<
        ApiResponse<{ id: string; name: string }[]>
      >(`${this.apiUrl}/project-team?projectId=${projectId}`)
      .pipe(
        map((response) =>
          this.convertResponse<{ id: string; name: string }[]>(response),
        ),
      );
  }

  getProjectLogs(projectId: number): Observable<ApiResponse<TimesheetDto[]>> {
    return this.http
      .get<
        ApiResponse<TimesheetDto[]>
      >(`${this.apiUrl}/project-timesheets?projectId=${projectId}`)
      .pipe(map((response) => this.convertResponse<TimesheetDto[]>(response)));
  }

  getTaskLogs(taskId: number): Observable<ApiResponse<TimesheetDetails[]>> {
    return this.http
      .get<
        ApiResponse<TimesheetDetails[]>
      >(`${this.apiUrl}/view-timesheets?taskId=${taskId}`)
      .pipe(
        map((response) => this.convertResponse<TimesheetDetails[]>(response)),
      );
  }

  deleteLog(id: number): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/delete-timesheet/${id}`)
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  updateLog(id: number, dto: TimesheetDto): Observable<ApiResponse<void>> {
    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/update-timesheet/${id}`, dto)
      .pipe(map((response) => this.convertResponse<void>(response)));
  }
}
