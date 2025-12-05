import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardStats } from '../../Interfaces/Analytics/dashboard-stats.interface';
import { RecentActivity } from '../../Interfaces/Analytics/recent-activity.interface';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private apiUrl = 'http://localhost:5065/api/analytics';

    constructor(private http: HttpClient) { }

    getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
        return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/dashboard-stats`);
    }

    getRecentActivity(): Observable<ApiResponse<RecentActivity[]>> {
        return this.http.get<ApiResponse<RecentActivity[]>>(`${this.apiUrl}/recent-activity`);
    }
}
