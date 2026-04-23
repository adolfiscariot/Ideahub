import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  VoteRequest,
  UnvoteRequest,
  SeeVotesRequest,
  VoteDetails,
} from '../Interfaces/Ideas/idea-interfaces';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VoteService {
  private readonly apiUrl = `${environment.apiUrl}/vote`;
  private http = inject(HttpClient);

  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data,
    };
  }

  // POST cast vote for idea
  castVote(request: VoteRequest): Observable<ApiResponse<void>> {
    const params = new HttpParams()
      .set('groupId', request.groupId)
      .set('ideaId', request.ideaId);

    return this.http
      .post<ApiResponse<void>>(`${this.apiUrl}/cast-vote`, {}, { params })
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  // POST remove vote (unvote)
  unvote(request: UnvoteRequest): Observable<ApiResponse<void>> {
    const params = new HttpParams().set('voteId', request.voteId);

    return this.http
      .post<ApiResponse<void>>(`${this.apiUrl}/unvote`, {}, { params })
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  // GET see votes for an idea (Group Admin only)
  seeVotes(request: SeeVotesRequest): Observable<ApiResponse<VoteDetails[]>> {
    const params = new HttpParams().set('ideaId', request.ideaId);

    return this.http
      .get<ApiResponse<VoteDetails[]>>(`${this.apiUrl}/see-votes`, { params })
      .pipe(map((response) => this.convertResponse<VoteDetails[]>(response)));
  }
}
