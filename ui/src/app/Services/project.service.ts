// project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Project, CreateProjectRequest, UpdateProjectRequest, ProjectDetails, ProjectSummary, ApiResponse} from '../Interfaces/Projects/project-interface';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = 'http://localhost:5065/api/project';

  constructor(private http: HttpClient) { }

  private convertResponse<T>(response: any): ApiResponse<T> {
    return {
      success: response.status || false,
      message: response.message || '',
      data: response.data
    };
  }

  // CREATE: Create a new project from an idea
  createProject(groupId: string, ideaId: string, request: CreateProjectRequest): Observable<ApiResponse<Project>> {
    const params = new HttpParams()
      .set('groupId', groupId)
      .set('ideaId', ideaId);
    
    return this.http.post<any>(`${this.apiUrl}/create-project`, request, { params }).pipe(
      map(response => this.convertResponse<Project>(response))
    );
  }

  // READ: Get all projects for a group
  getProjectsByGroup(groupId: string): Observable<ApiResponse<ProjectSummary[]>> {
    const params = new HttpParams().set('groupId', groupId);
    
    return this.http.get<any>(`${this.apiUrl}/view-projects`, { params }).pipe(
      map(response => this.convertResponse<ProjectSummary[]>(response))
    );
  }

  // READ: Get a single project
  getProjectDetails(groupId: string, projectId: string): Observable<ApiResponse<ProjectDetails>> {
    const params = new HttpParams()
      .set('groupId', groupId)
      .set('projectId', projectId);
    
    return this.http.get<any>(`${this.apiUrl}/open-project`, { params }).pipe(
      map(response => this.convertResponse<ProjectDetails>(response))
    );
  }

  // UPDATE: Update a project
  updateProject(projectId: string, request: UpdateProjectRequest): Observable<ApiResponse<ProjectDetails>> {
    return this.http.put<any>(`${this.apiUrl}/${projectId}`, request).pipe(
      map(response => this.convertResponse<ProjectDetails>(response))
    );
  }

  // DELETE: Delete a project
  deleteProject(projectId: string): Observable<ApiResponse<any>> {
    return this.http.delete<any>(`${this.apiUrl}/${projectId}`).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // HELPER: Check if user can update project
  canUserUpdateProject(project: Project, userId: string): boolean {
    return project.createdByUserId === userId || project.overseenByUserId === userId;
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