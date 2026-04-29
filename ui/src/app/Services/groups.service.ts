import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import {
  Group,
  GroupMember,
  GroupMembershipRequest,
  AddGroup,
  JoinGroupResponse,
} from '../Interfaces/Groups/groups-interfaces';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private apiUrl = `${environment.apiUrl}/group`;

  private http = inject(HttpClient);

  // Helper method to convert backend response to our interface
  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data,
    };
  }

  // ===== Mapping to current existing endpoints =====

  // GET /api/group/view-groups
  getGroups(): Observable<ApiResponse<Group[]>> {
    return this.http
      .get<ApiResponse<Group[]>>(`${this.apiUrl}/view-groups`)
      .pipe(map((response) => this.convertResponse<Group[]>(response)));
  }

  // POST /api/group/create-group
  createGroup(newGroup: AddGroup): Observable<ApiResponse<Group>> {
    return this.http
      .post<ApiResponse<Group>>(`${this.apiUrl}/create-group`, newGroup)
      .pipe(map((response) => this.convertResponse<Group>(response)));
  }

  // POST /api/group/join-group?groupId={guid}
  joinGroup(groupId: string): Observable<ApiResponse<JoinGroupResponse>> {
    const params = new HttpParams().set('groupId', groupId);
    return this.http
      .post<
        ApiResponse<JoinGroupResponse>
      >(`${this.apiUrl}/join-group`, {}, { params })
      .pipe(
        map((response) => this.convertResponse<JoinGroupResponse>(response)),
      );
  }

  // GET /api/group/get-members?groupId={guid}
  getGroupMembers(groupId: string): Observable<ApiResponse<GroupMember[]>> {
    const params = new HttpParams().set('groupId', groupId);
    return this.http
      .get<ApiResponse<GroupMember[]>>(`${this.apiUrl}/get-members`, { params })
      .pipe(map((response) => this.convertResponse<GroupMember[]>(response)));
  }

  // GET /api/group/view-requests?groupId={guid}
  viewRequests(
    groupId: string,
  ): Observable<ApiResponse<GroupMembershipRequest[]>> {
    const params = new HttpParams().set('groupId', groupId);
    return this.http
      .get<
        ApiResponse<GroupMembershipRequest[]>
      >(`${this.apiUrl}/view-requests`, { params })
      .pipe(
        map((response) =>
          this.convertResponse<GroupMembershipRequest[]>(response),
        ),
      );
  }

  viewGlobalRequests(): Observable<ApiResponse<GroupMembershipRequest[]>> {
    return this.http
      .get<
        ApiResponse<GroupMembershipRequest[]>
      >(`${this.apiUrl}/view-global-requests`)
      .pipe(
        map((response) =>
          this.convertResponse<GroupMembershipRequest[]>(response),
        ),
      );
  }

  rejectRequest(
    groupId: string,
    requestUserEmail: string,
  ): Observable<ApiResponse<void>> {
    const params = new HttpParams()
      .set('groupId', groupId)
      .set('requestUserEmail', requestUserEmail);

    return this.http
      .post<ApiResponse<void>>(`${this.apiUrl}/reject-request`, {}, { params })
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  // POST /api/group/accept-request?groupId={guid}&requestUserId={userId}
  acceptRequest(
    groupId: string,
    requestUserEmail: string,
  ): Observable<ApiResponse<void>> {
    const params = new HttpParams()
      .set('groupId', groupId)
      .set('requestUserEmail', requestUserEmail);

    return this.http
      .post<ApiResponse<void>>(`${this.apiUrl}/accept-request`, {}, { params })
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  // POST /api/group/leave-group?groupId={guid}
  leaveGroup(groupId: string): Observable<ApiResponse<void>> {
    const params = new HttpParams().set('groupId', groupId);
    return this.http
      .post<ApiResponse<void>>(`${this.apiUrl}/leave-group`, {}, { params })
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  // DELETE /api/group/{groupId}
  deleteGroup(groupId: string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/${groupId}`)
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  // POST /api/group/transfer-ownership
  transferOwnership(
    groupId: string,
    newOwnerEmail: string,
  ): Observable<ApiResponse<void>> {
    const params = new HttpParams()
      .set('groupId', groupId)
      .set('newOwnerEmail', newOwnerEmail);

    return this.http
      .post<
        ApiResponse<void>
      >(`${this.apiUrl}/transfer-ownership`, {}, { params })
      .pipe(map((response) => this.convertResponse<void>(response)));
  }
}
