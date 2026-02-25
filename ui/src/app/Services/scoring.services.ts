import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, BusinessCaseDto, ScoringDimensionsDto } from '../Interfaces/Ideas/idea-interfaces';

@Injectable({
    providedIn: 'root'
})
export class ScoringService {
    private apiUrl = 'http://localhost:5065/api/scoring';
    private http = inject(HttpClient);

    private convertResponse<T>(response: any): ApiResponse<T> {
        return {
            success: response.status || false,
            message: response.message || '',
            data: response.data
        };
    }

    // Phase 1: Automated AI Evaluation
    evaluateIdea(ideaId: number): Observable<ApiResponse<any>> {
        return this.http.post<any>(`${this.apiUrl}/evaluate/${ideaId}`, {}).pipe(
            map(res => this.convertResponse<any>(res))
        );
    }

    // Phase 2: Manual Business Case Submission
    submitBusinessCase(ideaId: number, dto: BusinessCaseDto): Observable<ApiResponse<any>> {
        return this.http.post<any>(`${this.apiUrl}/business-case/${ideaId}`, dto).pipe(
            map(res => this.convertResponse<any>(res))
        );
    }

    // Phase 3: Manual Scoring Dimensions
    submitScoringDimensions(ideaId: number, dto: ScoringDimensionsDto): Observable<ApiResponse<any>> {
        return this.http.post<any>(`${this.apiUrl}/dimensions/${ideaId}`, dto).pipe(
            map(res => this.convertResponse<any>(res))
        );
    }
}
