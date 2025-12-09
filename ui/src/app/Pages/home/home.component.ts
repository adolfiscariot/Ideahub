import { Component, OnInit } from '@angular/core';
import { BaseLayoutComponent } from "../../Components/base-layout/base-layout.component";
import { AnalyticsService } from '../../Services/analytics.service';
import { CommonModule } from '@angular/common';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroChartBar,
  heroLockOpen,
  heroRocketLaunch,
  heroLockClosed,
  heroFire,
  heroTrophy,
  heroBuildingOffice2,
  heroLightBulb,
  heroHandThumbUp,
  heroBriefcase
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BaseLayoutComponent, CommonModule, NgIcon],
  viewProviders: [provideIcons({
    heroChartBar,
    heroLockOpen,
    heroRocketLaunch,
    heroLockClosed,
    heroFire,
    heroTrophy,
    heroBuildingOffice2,
    heroLightBulb,
    heroHandThumbUp,
    heroBriefcase
  })],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  mostVotedIdeas: any[] = [];
  topContributors: any[] = [];
  promotedIdeas: any[] = [];
  ideaStats: any = null;
  groupEngagement: any[] = [];
  personalStats: any = null;

  constructor(private analyticsService: AnalyticsService) { }

  ngOnInit(): void {
    this.fetchAnalytics();
  }

  fetchAnalytics() {
    this.analyticsService.getMostVotedIdeas().subscribe({
      next: (res) => {
        if (res.status) this.mostVotedIdeas = res.data;
      },
      error: (err) => console.error('Error fetching most voted ideas', err)
    });

    this.analyticsService.getTopContributors().subscribe({
      next: (res) => {
        if (res.status) this.topContributors = res.data;
      },
      error: (err) => console.error('Error fetching top contributors', err)
    });

    this.analyticsService.getPromotedIdeas().subscribe({
      next: (res) => {
        if (res.status) this.promotedIdeas = res.data;
      },
      error: (err) => console.error('Error fetching promoted ideas', err)
    });

    this.analyticsService.getIdeaStatistics().subscribe({
      next: (res) => {
        if (res.status) this.ideaStats = res.data;
      },
      error: (err) => console.error('Error fetching idea statistics', err)
    });

    this.analyticsService.getGroupEngagement().subscribe({
      next: (res) => {
        if (res.status) this.groupEngagement = res.data;
      },
      error: (err) => console.error('Error fetching group engagement', err)
    });

    this.analyticsService.getPersonalStats().subscribe({
      next: (res) => {
        if (res.status) this.personalStats = res.data;
      },
      error: (err) => console.error('Error fetching personal stats', err)
    });
  }
}
