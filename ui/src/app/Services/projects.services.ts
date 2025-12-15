// projects.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../Interfaces/Ideas/idea-interfaces';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Helper method to convert backend response
  private convertResponse<T>(response: any): ApiResponse<T> {
    return {
      success: response.status || false,
      message: response.message || '',
      data: response.data
    };
  }

  // POST create project from idea
  createProjectFromIdea(groupId: string, ideaId: string): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('groupId', groupId)
      .set('ideaId', ideaId);
    
    return this.http.post<any>(`${this.apiUrl}/create-project`, {}, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }
}