import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../Interfaces/Groups/groups-interfaces';

@Injectable({
  providedIn: 'root'
})
export class GroupsService {
  private apiUrl = 'http://localhost:5065/api/group';
  
  constructor(private http: HttpClient) { }

  // Helper method to convert backend response to our interface
  private convertResponse<T>(response: any): ApiResponse<T> {
    return {
      success: response.status || false,
      message: response.message || '',
      data: response.data
    };
  }

  // ===== YOUR ACTUAL ENDPOINTS =====

  // GET /api/group/view-groups
  getGroups(): Observable<ApiResponse<any>> {
    return this.http.get<any>(`${this.apiUrl}/view-groups`).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // POST /api/group/create-group
  createGroup(newGroup: any): Observable<ApiResponse<any>> {
    return this.http.post<any>(`${this.apiUrl}/create-group`, newGroup).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // POST /api/group/join-group?groupId=1
  joinGroup(groupId: number): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('groupId', groupId.toString());
    return this.http.post<any>(`${this.apiUrl}/join-group`, {}, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // GET /api/group/get-members?groupId=1
  getGroupMembers(groupId: number): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('groupId', groupId.toString());
    return this.http.get<any>(`${this.apiUrl}/get-members`, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // GET /api/group/{groupId}
  getGroupById(groupId: number): Observable<ApiResponse<any>> {
    return this.http.get<any>(`${this.apiUrl}/${groupId}`).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // GET /api/group/view-requests?groupId=1
  getPendingRequests(groupId: number): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('groupId', groupId.toString());
    return this.http.get<any>(`${this.apiUrl}/view-requests`, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // POST /api/group/leave-group?groupId=1
  leaveGroup(groupId: number): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('groupId', groupId.toString());
    return this.http.post<any>(`${this.apiUrl}/leave-group`, {}, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // POST /api/group/accept-request?groupId=1&requestUserId={userId}
  acceptRequest(groupId: number, requestUserId: string): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('groupId', groupId.toString())
      .set('requestUserId', requestUserId);
    
    return this.http.post<any>(`${this.apiUrl}/accept-request`, {}, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // POST /api/group/reject-request?groupId=1&requestUserId={userId}
  rejectRequest(groupId: number, requestUserId: string): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('groupId', groupId.toString())
      .set('requestUserId', requestUserId);
    
    return this.http.post<any>(`${this.apiUrl}/reject-request`, {}, { params }).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }

  // DELETE /api/group/{groupId}
  deleteGroup(groupId: number): Observable<ApiResponse<any>> {
    return this.http.delete<any>(`${this.apiUrl}/${groupId}`).pipe(
      map(response => this.convertResponse<any>(response))
    );
  }
}