import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { UserRecord } from '../Interfaces/Users/user-interface';

@Injectable({
  providedIn: 'root',
})
export class CommitteeMembersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Committee`;

  // Helper method to convert backend response to our interface
  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data,
    };
  }

  getCommitteeMembers(): Observable<ApiResponse<UserRecord[]>> {
    return this.http
      .get<ApiResponse<UserRecord[]>>(this.apiUrl)
      .pipe(map((response) => this.convertResponse<UserRecord[]>(response)));
  }

  getAllUsers(): Observable<ApiResponse<UserRecord[]>> {
    return this.http
      .get<ApiResponse<UserRecord[]>>(`${this.apiUrl}/users`)
      .pipe(map((response) => this.convertResponse<UserRecord[]>(response)));
  }

  addCommitteeMember(email: string): Observable<ApiResponse<void>> {
    return this.http
      .post<ApiResponse<void>>(`${this.apiUrl}/add/${email}`, {})
      .pipe(map((response) => this.convertResponse<void>(response)));
  }
}
