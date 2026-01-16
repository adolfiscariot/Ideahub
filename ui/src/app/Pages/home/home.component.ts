import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AnalyticsService } from '../../Services/analytics.service';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from '../../Components/stat-card/stat-card.component';
import { DashboardCardComponent } from '../../Components/dashboard-card/dashboard-card.component';
import { ViewIdeaModalComponent } from '../../Components/modals/view-idea-modal/view-idea-modal.component';
import {
  MostVotedIdea,
  TopContributor,
  PromotedIdea,
  IdeaStats,
  GroupEngagement,
  PersonalStats
} from '../../Models/analytics.models';

import { provideIcons } from '@ng-icons/core';
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
  heroBriefcase,
  heroUserGroup,
  heroStar
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    StatCardComponent,
    DashboardCardComponent,
    ViewIdeaModalComponent
  ],
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
    heroBriefcase,
    heroUserGroup,
    heroStar
  })],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  mostVotedIdeas: MostVotedIdea[] = [];
  topContributors: TopContributor[] = [];
  promotedIdeas: PromotedIdea[] = [];
  ideaStats: IdeaStats | null = null;
  groupEngagement: GroupEngagement[] = [];
  personalStats: PersonalStats | null = null;

  selectedIdea: MostVotedIdea | PromotedIdea | null = null;
  isModalOpen: boolean = false;

  constructor(private analyticsService: AnalyticsService) { }

  openIdeaModal(idea: MostVotedIdea | PromotedIdea) {
    this.selectedIdea = idea;
    this.isModalOpen = true;
  }

  closeIdeaModal() {
    this.isModalOpen = false;
    this.selectedIdea = null;
  }

  ngOnInit(): void {
    this.fetchAnalytics();
  }

  fetchAnalytics() {
    forkJoin({
      mostVoted: this.analyticsService.getMostVotedIdeas(),
      topContributors: this.analyticsService.getTopContributors(),
      promoted: this.analyticsService.getPromotedIdeas(),
      stats: this.analyticsService.getIdeaStatistics(),
      engagement: this.analyticsService.getGroupEngagement(),
      personal: this.analyticsService.getPersonalStats()
    }).subscribe({
      next: (results) => {
        if (results.mostVoted.status) this.mostVotedIdeas = results.mostVoted.data;
        if (results.topContributors.status) this.topContributors = results.topContributors.data;
        if (results.promoted.status) this.promotedIdeas = results.promoted.data;
        if (results.stats.status) this.ideaStats = results.stats.data;
        if (results.engagement.status) this.groupEngagement = results.engagement.data;
        if (results.personal.status) this.personalStats = results.personal.data;
      },
      error: (err) => console.error('Error fetching analytics', err)
    });
  }
}
