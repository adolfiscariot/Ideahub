import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../Interfaces/Groups/groups-interfaces';
import { viewComment } from '../Interfaces/Ideas/idea-interfaces';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommentsService {
  private readonly apiUrl = `${environment.apiUrl}/comment`;
  private http = inject(HttpClient);

  // Helper method to convert backend response to our interface
  private convertResponse<T>(response: any): ApiResponse<T> {
    return {
      success: response.status || false,
      message: response.message || '',
      data: response.data
    };
  }

  // GET /api/comment/view-comments?ideaID
  getComments(ideaId: number): Observable<ApiResponse<viewComment[]>> {
    //const params = new HttpParams().set('IdeaId', ideaId);
    return this.http.get<any>(`${this.apiUrl}/view-comments?ideaId=${ideaId}`).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // POST /api/comment/create-comment?ideaID
  postComment(ideaId: number, newComment: any): Observable<ApiResponse<viewComment>> {
    return this.http.post<any>(`${this.apiUrl}/create-comment?ideaId=${ideaId}`, newComment).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // DELETE /api/comment/{commentId}
  deleteComment(commentId: number): Observable<ApiResponse<any>> {
    return this.http.delete<any>(`${this.apiUrl}/${commentId}`).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }
}