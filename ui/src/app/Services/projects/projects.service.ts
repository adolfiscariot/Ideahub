import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { Project } from '../../Interfaces/Projects/Project';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';

@Injectable({
    providedIn: 'root'
})
export class ProjectsService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:5065/api/Project';

    constructor() { }

    getMyProjects(): Observable<Project[]> {
        return this.http.get<ApiResponse>(`${this.apiUrl}/all`).pipe(
            map(response => {
                if (!response.status || !response.data) {
                    throw new Error(response.message || 'Failed to fetch projects');
                }
                // Map backend response to Project interface
                return (response.data as any[]).map(item => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    status: item.status, // Assuming backend returns string matching enum or string
                    createdAt: item.createdAt,
                    endedAt: item.endedAt,
                    overseenBy: item.overseenByUserName,
                    overseenById: item.overseenByUserId,
                    groupName: item.groupName,
                    ideaTitle: item.ideaName
                } as Project));
            }),
            catchError(error => {
                console.error('Error fetching projects:', error);
                return throwError(() => new Error(error.message || 'Failed to fetch projects'));
            })
        );
    }

    updateProject(id: number, projectData: any): Observable<any> {
        return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, projectData).pipe(
            map(response => response.data),
            catchError(error => {
                console.error('Error updating project:', error);
                return throwError(() => new Error(error.message || 'Failed to update project'));
            })
        );
    }
}
