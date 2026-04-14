import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Idea, CreateIdeaRequest, VoteRequest, PromoteRequest, IdeaUpdate, UnvoteRequest, SeeVotesRequest } from '../Interfaces/Ideas/idea-interfaces';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { VoteService } from './vote.service';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IdeasService {
  private readonly apiUrl = `${environment.apiUrl}/idea`;
  private http = inject(HttpClient);
  private voteService = inject(VoteService);

  // Helper method to convert backend response
  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data
    };
  }

  // GET all ideas for a group
  getIdeasByGroup(groupId: string, type?: string, domain?: string, impact?: string): Observable<ApiResponse<Idea[]>> {
    let params = new HttpParams().set('groupId', groupId);

    if (type) {
      params = params.set('type', type);
    }
    if (domain) {
      params = params.set('domain', domain);
    }
    if (impact) {
      params = params.set('impact', impact);
    }
    return this.http.get<ApiResponse<Idea[]>>(`${this.apiUrl}/view-ideas`, { params }).pipe(
      map(response => this.convertResponse<Idea[]>(response))
    );
  }

  // GET single idea
  getIdea(groupId: string, ideaId: string): Observable<ApiResponse<Idea>> {
    const params = new HttpParams()
      .set('groupId', groupId)
      .set('ideaId', ideaId);

    return this.http.get<ApiResponse<Idea>>(`${this.apiUrl}/open-idea`, { params }).pipe(
      map(response => this.convertResponse<Idea>(response))
    );
  }

  // POST create new idea
  createIdea(request: CreateIdeaRequest): Observable<ApiResponse<Idea>> {
    const params = new HttpParams().set('groupId', request.groupId);

    return this.http.post<ApiResponse<Idea>>(`${this.apiUrl}/create-idea`, {
      Title: request.Title,
      ProblemStatement: request.ProblemStatement,
      ProposedSolution: request.ProposedSolution,
      StrategicAlignment: request.StrategicAlignment,
      UseCase: request.UseCase,
      InnovationCategory: request.InnovationCategory,
      SubCategory: request.SubCategory,
      TechnologyInvolved: request.TechnologyInvolved,
      Notes: request.Notes
    }, { params }).pipe(
      map(response => this.convertResponse<Idea>(response))
    );
  }

  // PUT update idea
  updateIdea(ideaId: string, updateIdea: IdeaUpdate): Observable<ApiResponse<Idea>> {
    return this.http.put<ApiResponse<Idea>>(`${this.apiUrl}/${ideaId}`, updateIdea).pipe(
      map(response => this.convertResponse<Idea>(response))
    );
  }

  // Close idea
  closeIdea(ideaId: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${this.apiUrl}/close-idea?ideaId=${ideaId}`,
      null
    ).pipe(
      map(res => this.convertResponse<void>(res))
    );
  }

  // DELETE idea
  deleteIdea(ideaId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${ideaId}`).pipe(
      map(response => this.convertResponse<void>(response))
    );
  }

  // POST promote idea to project
  promoteIdea(request: PromoteRequest): Observable<ApiResponse<void>> {
    const params = new HttpParams()
      .set('groupId', request.groupId)
      .set('ideaId', request.ideaId);

    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/promote-idea`, {}, { params }).pipe(
      map(response => this.convertResponse<void>(response))
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