import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Idea, CreateIdeaRequest, ApiResponse, VoteRequest, PromoteRequest } from '../Interfaces/Ideas/idea-interfaces';

@Injectable({
  providedIn: 'root'
})
export class IdeasService {
  private apiUrl = 'http://localhost:5065/api/idea';

  constructor(private http: HttpClient) { }

  // Helper method to convert backend response
  private convertResponse<T>(response: any): ApiResponse<T> {
    return {
      success: response.status || false,
      message: response.message || '',
      data: response.data
    };
  }

  // GET all ideas for a group
  getIdeasByGroup(groupId: string): Observable<ApiResponse<Idea[]>> {
    const params = new HttpParams().set('groupId', groupId);
    return this.http.get<any>(`${this.apiUrl}/view-ideas`, { params }).pipe(
      map(response => this.convertResponse<Idea[]>(response))
    );
  }

  // GET single idea
  getIdea(groupId: string, ideaId: string): Observable<ApiResponse<Idea>> {
    const params = new HttpParams()
      .set('groupId', groupId)
      .set('ideaId', ideaId);
    
    return this.http.get<any>(`${this.apiUrl}/open-idea`, { params }).pipe(
      map(response => this.convertResponse<Idea>(response))
    );
  }

  // POST create new idea
  createIdea(request: CreateIdeaRequest): Observable<ApiResponse<Idea>> {
    const params = new HttpParams().set('groupId', request.groupId);
    return this.http.post<any>(`${this.apiUrl}/create-idea`, {
      title: request.title,
      description: request.description
    }, { params }).pipe(
      map(response => this.convertResponse<Idea>(response))
    );
  }

  // PUT update idea
  updateIdea(ideaId: string, idea: Partial<Idea>): Observable<ApiResponse<Idea>> {
    return this.http.put<any>(`${this.apiUrl}/idea/${ideaId}`, idea).pipe(
      map(response => this.convertResponse<Idea>(response))
    );
  }

  // DELETE idea
  deleteIdea(ideaId: string): Observable<ApiResponse<any>> {
    return this.http.delete<any>(`${this.apiUrl}/idea/${ideaId}`).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // POST promote idea to project
  promoteIdea(request: PromoteRequest): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('groupId', request.groupId)
      .set('ideaId', request.ideaId);
    
    return this.http.post<any>(`${this.apiUrl}/idea/promote-idea`, {}, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // POST vote for idea
  voteForIdea(request: VoteRequest): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('groupId', request.groupId)
      .set('ideaId', request.ideaId);
    
    return this.http.post<any>(`${this.apiUrl}/vote-idea`, {}, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }
}