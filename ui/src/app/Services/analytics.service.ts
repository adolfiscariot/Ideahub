import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { environment } from '../../environments/environment';
import {
  MostVotedIdea,
  TopContributor,
  PromotedIdea,
  IdeaStats,
  GroupEngagement,
  PersonalStats,
} from '../Models/analytics.models';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly baseUrl = `${environment.apiUrl}/analytics`;

  private http = inject(HttpClient);

  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data,
    };
  }

  getMostVotedIdeas(): Observable<ApiResponse<MostVotedIdea[]>> {
    return this.http
      .get<ApiResponse<MostVotedIdea[]>>(`${this.baseUrl}/most-voted`)
      .pipe(
        map((response: ApiResponse<MostVotedIdea[]>) =>
          this.convertResponse<MostVotedIdea[]>(response),
        ),
      );
  }

  getTopContributors(): Observable<ApiResponse<TopContributor[]>> {
    return this.http
      .get<ApiResponse<TopContributor[]>>(`${this.baseUrl}/top-contributors`)
      .pipe(
        map((response: ApiResponse<TopContributor[]>) =>
          this.convertResponse<TopContributor[]>(response),
        ),
      );
  }

  getPromotedIdeas(): Observable<ApiResponse<PromotedIdea[]>> {
    return this.http
      .get<ApiResponse<PromotedIdea[]>>(`${this.baseUrl}/promoted-ideas`)
      .pipe(
        map((response: ApiResponse<PromotedIdea[]>) =>
          this.convertResponse<PromotedIdea[]>(response),
        ),
      );
  }

  getIdeaStatistics(): Observable<ApiResponse<IdeaStats>> {
    return this.http
      .get<ApiResponse<IdeaStats>>(`${this.baseUrl}/idea-statistics`)
      .pipe(
        map((response: ApiResponse<IdeaStats>) =>
          this.convertResponse<IdeaStats>(response),
        ),
      );
  }

  getGroupEngagement(): Observable<ApiResponse<GroupEngagement[]>> {
    return this.http
      .get<ApiResponse<GroupEngagement[]>>(`${this.baseUrl}/group-engagement`)
      .pipe(
        map((response: ApiResponse<GroupEngagement[]>) =>
          this.convertResponse<GroupEngagement[]>(response),
        ),
      );
  }

  getPersonalStats(): Observable<ApiResponse<PersonalStats>> {
    return this.http
      .get<ApiResponse<PersonalStats>>(`${this.baseUrl}/personal-stats`)
      .pipe(
        map((response: ApiResponse<PersonalStats>) =>
          this.convertResponse<PersonalStats>(response),
        ),
      );
  }
}
