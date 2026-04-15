import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { viewComment, createComment } from '../Interfaces/Ideas/idea-interfaces';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommentsService {
  private readonly apiUrl = `${environment.apiUrl}/comment`;
  private http = inject(HttpClient);

  // Helper method to convert backend response to our interface
  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data
    };
  }

  // GET /api/comment/view-comments?ideaID
  getComments(ideaId: number): Observable<ApiResponse<viewComment[]>> {
    return this.http.get<ApiResponse<viewComment[]>>(`${this.apiUrl}/view-comments?ideaId=${ideaId}`).pipe(
      map(response => this.convertResponse<viewComment[]>(response))
    );
  }

  // POST /api/comment/create-comment?ideaID
  postComment(ideaId: number, newComment: createComment): Observable<ApiResponse<viewComment>> {
    return this.http.post<ApiResponse<viewComment>>(`${this.apiUrl}/create-comment?ideaId=${ideaId}`, newComment).pipe(
      map(response => this.convertResponse<viewComment>(response))
    );
  }

  // DELETE /api/comment/{commentId}
  deleteComment(commentId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${commentId}`).pipe(
      map(response => this.convertResponse<void>(response))
    );
  }
}