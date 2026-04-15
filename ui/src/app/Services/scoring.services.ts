import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { BusinessCaseDto, ScoringDimensionsDto } from '../Interfaces/Ideas/idea-interfaces';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ScoringService {
    private readonly apiUrl = `${environment.apiUrl}/scoring`;
    private http = inject(HttpClient);

    private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
        return {
            success: response.status || response.success || false,
            message: response.message || '',
            data: response.data
        };
    }

    // Phase 1: Automated AI Evaluation
    evaluateIdea(ideaId: string): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.apiUrl}/evaluate/${ideaId}`, {}).pipe(
            map(res => this.convertResponse<void>(res))
        );
    }

    // Phase 2: Manual Business Case Submission
    submitBusinessCase(ideaId: string, dto: BusinessCaseDto): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.apiUrl}/business-case/${ideaId}`, dto).pipe(
            map(res => this.convertResponse<void>(res))
        );
    }

    getBusinessCase(ideaId: string): Observable<ApiResponse<BusinessCaseDto>> {
        return this.http.get<ApiResponse<BusinessCaseDto>>(`${this.apiUrl}/business-case/${ideaId}`).pipe(
            map(res => this.convertResponse<BusinessCaseDto>(res))
        );
    }

    // Phase 3: Manual Scoring Dimensions
    submitScoringDimensions(ideaId: string, dto: ScoringDimensionsDto): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.apiUrl}/dimensions/${ideaId}`, dto).pipe(
            map(res => this.convertResponse<void>(res))
        );
    }

    getScoringDimensions(ideaId: string): Observable<ApiResponse<ScoringDimensionsDto>> {
        return this.http.get<ApiResponse<ScoringDimensionsDto>>(`${this.apiUrl}/dimensions/${ideaId}`).pipe(
            map(res => this.convertResponse<ScoringDimensionsDto>(res))
        );
    }
}
