import { AppConfigService } from '../core/services/app-config.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import {
  Project,
  ProjectStatus,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectDetails,
  ProjectSummary,
  ProjectBackendDto,
} from '../Interfaces/Projects/project-interface';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private appConfig = inject(AppConfigService);
  private get apiUrl() { return `${this.appConfig.apiUrl}/project`; }
  private http = inject(HttpClient);

  // Helper method to convert backend response
  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data,
    };
  }

  // Consolidated Mapping logic
  private mapDtoToProject(item: ProjectBackendDto): Project {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status as unknown as ProjectStatus,
      createdAt: item.createdAt,
      endedAt: item.endedAt,
      overseenBy: item.overseenByUserName,
      overseenById: item.overseenByUserId,
      groupName: item.groupName,
      ideaTitle: item.ideaName,
      progress: item.progress || 0,
    } as Project;
  }

  // CREATE: Create a new project from an idea
  createProject(
    groupId: string,
    ideaId: string,
    request: CreateProjectRequest,
  ): Observable<ApiResponse<{ projectId: number }>> {
    const params = new HttpParams()
      .set('groupId', groupId)
      .set('ideaId', ideaId);

    return this.http
      .post<
        ApiResponse<{ projectId: number }>
      >(`${this.apiUrl}/create-project`, request, { params })
      .pipe(
        map((response) =>
          this.convertResponse<{ projectId: number }>(response),
        ),
        catchError((error) =>
          throwError(
            () => new Error(error.error?.message || 'Failed to create project'),
          ),
        ),
      );
  }

  getMyProjects(): Observable<Project[]> {
    return this.http
      .get<ApiResponse<ProjectBackendDto[]>>(`${this.apiUrl}/all`)
      .pipe(
        map((response) => this.convertResponse<ProjectBackendDto[]>(response)),
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch projects');
          }
          return response.data.map((item) => this.mapDtoToProject(item));
        }),
        catchError((error) =>
          throwError(
            () => new Error(error.message || 'Failed to fetch projects'),
          ),
        ),
      );
  }

  // READ: Get all projects for a group
  getProjectsByGroup(
    groupId: string,
  ): Observable<ApiResponse<ProjectSummary[]>> {
    const params = new HttpParams().set('groupId', groupId);

    return this.http
      .get<
        ApiResponse<ProjectSummary[]>
      >(`${this.apiUrl}/view-projects`, { params })
      .pipe(
        map((response) => this.convertResponse<ProjectSummary[]>(response)),
        catchError((error) =>
          throwError(
            () =>
              new Error(
                error.error?.message || 'Failed to fetch group projects',
              ),
          ),
        ),
      );
  }

  // READ: Get project by ID only
  getProjectById(projectId: number): Observable<ApiResponse<ProjectDetails>> {
    return this.http
      .get<ApiResponse<ProjectDetails>>(`${this.apiUrl}/${projectId}`)
      .pipe(
        map((response) => this.convertResponse<ProjectDetails>(response)),
        catchError((error) =>
          throwError(
            () =>
              new Error(
                error.error?.message || 'Failed to fetch project details',
              ),
          ),
        ),
      );
  }

  // READ: Get a single project
  getProjectDetails(
    groupId: string,
    projectId: string,
  ): Observable<ApiResponse<ProjectDetails>> {
    const params = new HttpParams()
      .set('groupId', groupId)
      .set('projectId', projectId);

    return this.http
      .get<
        ApiResponse<ProjectDetails>
      >(`${this.apiUrl}/open-project`, { params })
      .pipe(
        map((response) => this.convertResponse<ProjectDetails>(response)),
        catchError((error) =>
          throwError(
            () => new Error(error.error?.message || 'Failed to open project'),
          ),
        ),
      );
  }

  // UPDATE: Update a project
  updateProject(
    projectId: number | string,
    request: UpdateProjectRequest | Partial<Project>,
  ): Observable<ApiResponse<ProjectDetails>> {
    return this.http
      .put<ApiResponse<ProjectDetails>>(`${this.apiUrl}/${projectId}`, request)
      .pipe(
        map((response) => this.convertResponse<ProjectDetails>(response)),
        catchError((error) =>
          throwError(
            () => new Error(error.error?.message || 'Failed to update project'),
          ),
        ),
      );
  }

  // DELETE: Delete a project
  deleteProject(projectId: number | string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/${projectId}`)
      .pipe(
        map((response) => this.convertResponse<void>(response)),
        catchError((error) =>
          throwError(
            () => new Error(error.error?.message || 'Failed to delete project'),
          ),
        ),
      );
  }

  // HELPER: Check if user can update project
  canUserUpdateProject(project: Project, userId: string): boolean {
    return (
      project.createdByUserId === userId ||
      project.overseenByUserId === userId ||
      project.overseenById === userId
    );
  }

  // HELPER: Check if user can delete project
  canUserDeleteProject(project: Project, userId: string): boolean {
    return project.createdByUserId === userId;
  }

  // HELPER: Format status for display
  formatStatus(status: string): string {
    return status.replace(/([A-Z])/g, ' $1').trim();
  }

  // HELPER: Get all project statuses
  getAllStatuses(): string[] {
    return ['Planning', 'Active', 'Completed', 'Shelved', 'Cancelled'];
  }
}
