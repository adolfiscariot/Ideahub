import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap, throwError } from 'rxjs';
import { Idea, CreateIdeaRequest, ApiResponse, VoteRequest, PromoteRequest, IdeaUpdate, UnvoteRequest, SeeVotesRequest  } from '../Interfaces/Ideas/idea-interfaces';
import { VoteService } from './vote.service';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class IdeasService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private voteService: VoteService) { }

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
  updateIdea(ideaId: string, updateIdea: IdeaUpdate): Observable<ApiResponse<Idea>> {
    console.log('Updating idea:', ideaId, updateIdea);
    return this.http.put<any>(`${this.apiUrl}/${ideaId}`, updateIdea).pipe(
      map(response => this.convertResponse<Idea>(response))
    );
  }

  // DELETE idea
  deleteIdea(ideaId: string): Observable<ApiResponse<any>> {
    return this.http.delete<any>(`${this.apiUrl}/${ideaId}`).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // POST promote idea to project
  promoteIdea(request: PromoteRequest): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('groupId', request.groupId)
      .set('ideaId', request.ideaId);
    
    return this.http.post<any>(`${this.apiUrl}/promote-idea`, {}, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // POST vote for idea
  voteForIdea(groupId: string, ideaId: string) {
    const request: VoteRequest = {
      groupId: groupId,
      ideaId: ideaId
    };
    return this.voteService.castVote(request);
  }

  // Remove vote
  removeVote(voteId: string) {
    const request: UnvoteRequest = {
      voteId: voteId
    };
    return this.voteService.unvote(request);
  }

  // Get votes for idea
  getVotesForIdea(ideaId: string) {
    const request: SeeVotesRequest = {
      ideaId: ideaId
    };
    return this.voteService.seeVotes(request);
  }
}