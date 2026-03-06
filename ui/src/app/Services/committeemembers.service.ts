import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { ApiResponse } from '../Interfaces/Ideas/idea-interfaces';

@Injectable({
    providedIn: 'root'
})
export class CommitteeMembersService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/Committee`;

    // Helper method to convert backend response to our interface
    private convertResponse<T>(response: any): ApiResponse<T> {
        return {
            success: response.status || false,
            message: response.message || '',
            data: response.data
        };
    }

    getCommitteeMembers(): Observable<ApiResponse<any>> {
        return this.http.get<any>(this.apiUrl).pipe(
            map(response => this.convertResponse<any>(response))
        );
    }

    getAllUsers(): Observable<ApiResponse<any>> {
        return this.http.get<any>(`${this.apiUrl}/users`).pipe(
            map(response => this.convertResponse<any>(response))
        );
    }

    addCommitteeMember(email: string): Observable<ApiResponse<any>> {
        return this.http.post<any>(`${this.apiUrl}/add/${email}`, {}).pipe(
            map(response => this.convertResponse<any>(response))
        );
    }
}
