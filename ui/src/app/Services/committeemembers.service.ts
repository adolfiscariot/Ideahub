import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';

@Injectable({
    providedIn: 'root'
})
export class CommitteeMembersService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/Committee`;

    getCommitteeMembers(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(this.apiUrl);
    }

    getAllUsers(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.apiUrl}/users`);
    }

    addCommitteeMember(email: string): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.apiUrl}/add/${email}`, {});
    }
}
