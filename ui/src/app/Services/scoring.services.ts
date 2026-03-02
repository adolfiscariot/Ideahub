import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, BusinessCaseDto, ScoringDimensionsDto } from '../Interfaces/Ideas/idea-interfaces';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ScoringService {
    private readonly apiUrl = `${environment.apiUrl}/scoring`;
    private http = inject(HttpClient);

    private convertResponse<T>(response: any): ApiResponse<T> {
        return {
            success: response.status || false,
            message: response.message || '',
            data: response.data
        };
    }

    // Phase 1: Automated AI Evaluation
    evaluateIdea(ideaId: string): Observable<ApiResponse<any>> {
        return this.http.post<any>(`${this.apiUrl}/evaluate/${ideaId}`, {}).pipe(
            map(res => this.convertResponse<any>(res))
        );
    }

    // Phase 2: Manual Business Case Submission
    submitBusinessCase(ideaId: string, dto: BusinessCaseDto): Observable<ApiResponse<any>> {
        return this.http.post<any>(`${this.apiUrl}/business-case/${ideaId}`, dto).pipe(
            map(res => this.convertResponse<any>(res))
        );
    }

    getBusinessCase(ideaId: string): Observable<ApiResponse<BusinessCaseDto>> {
        return this.http.get<any>(`${this.apiUrl}/business-case/${ideaId}`).pipe(
            map(res => this.convertResponse<BusinessCaseDto>(res))
        );
    }

    // Phase 3: Manual Scoring Dimensions
    submitScoringDimensions(ideaId: string, dto: ScoringDimensionsDto): Observable<ApiResponse<any>> {
        return this.http.post<any>(`${this.apiUrl}/dimensions/${ideaId}`, dto).pipe(
            map(res => this.convertResponse<any>(res))
        );
    }

    getScoringDimensions(ideaId: string): Observable<ApiResponse<ScoringDimensionsDto>> {
        return this.http.get<any>(`${this.apiUrl}/dimensions/${ideaId}`).pipe(
            map(res => this.convertResponse<ScoringDimensionsDto>(res))
        );
    }
}
