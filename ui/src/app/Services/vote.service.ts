import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  VoteRequest, 
  UnvoteRequest, 
  SeeVotesRequest, 
  VoteDetails, 
  ApiResponse 
} from '../Interfaces/Ideas/idea-interfaces';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class VoteService {
  private apiUrl = `${environment.apiUrl}/vote`;

  constructor(private http: HttpClient) {}

  private convertResponse<T>(response: any): ApiResponse<T> {
    return {
      success: response.status || false,
      message: response.message || '',
      data: response.data,
    };
  }

  // POST cast vote for idea
castVote(request: VoteRequest): Observable<ApiResponse<any>> {
  const params = new HttpParams()
    .set('groupId', request.groupId)
    .set('ideaId', request.ideaId);
  
  return this.http.post<any>(`${this.apiUrl}/cast-vote`, {}, { params }).pipe(
    map(response => this.convertResponse<any>(response))
  );
}


  // POST remove vote (unvote)
  unvote(request: UnvoteRequest): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('voteId', request.voteId);
    
    return this.http.post<any>(`${this.apiUrl}/unvote`, {}, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // GET see votes for an idea (Group Admin only) 
  seeVotes(request: SeeVotesRequest): Observable<ApiResponse<VoteDetails[]>> {
    const params = new HttpParams()
      .set('ideaId', request.ideaId);
    
    return this.http.get<any>(`${this.apiUrl}/see-votes`, { params }).pipe(
      map(response => this.convertResponse<VoteDetails[]>(response))
    );
  }
}