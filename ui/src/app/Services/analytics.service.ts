import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { environment } from '../../environments/environment.prod';

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getMostVotedIdeas(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/most-voted`);
    }

    getTopContributors(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/top-contributors`);
    }

    getPromotedIdeas(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/promoted-ideas`);
    }

    getIdeaStatistics(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/idea-statistics`);
    }

    getGroupEngagement(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/group-engagement`);
    }

    getPersonalStats(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/personal-stats`);
    }
}
