import { Component, OnInit, inject } from '@angular/core';
import { BaseLayoutComponent } from "../../Components/base-layout/base-layout.component";
import { AnalyticsService } from '../../Services/analytics/analytics.service';
import { DashboardStats } from '../../Interfaces/Analytics/dashboard-stats.interface';
import { RecentActivity } from '../../Interfaces/Analytics/recent-activity.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [BaseLayoutComponent, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  stats: DashboardStats | null = null;
  recentActivity: RecentActivity[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    this.isLoading = true;

    // Fetch stats
    this.analyticsService.getDashboardStats().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.stats = response.data;
        }
      },
      error: (err) => console.error('Failed to fetch stats', err)
    });

    // Fetch recent activity
    this.analyticsService.getRecentActivity().subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.recentActivity = response.data;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch recent activity', err);
        this.isLoading = false;
      }
    });
  }
}
