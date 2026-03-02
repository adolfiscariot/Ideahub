import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AnalyticsService } from '../../Services/analytics.service';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from '../../Components/stat-card/stat-card.component';
import { DashboardCardComponent } from '../../Components/dashboard-card/dashboard-card.component';
import { ModalComponent } from '../../Components/modal/modal.component';
import { ProjectService } from '../../Services/project.service';
import { Router } from '@angular/router';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
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
    ModalComponent,
    ButtonsComponent
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
  showWelcomeInfoModal = false;

  isProjectModalOpen = false;
  selectedProjectId: number | null = null;
  selectedGroupId: string | null = null;
  currentProject: any = null;


  constructor(private analyticsService: AnalyticsService, private projectService: ProjectService, private router: Router) { }

  ngOnInit(): void {
    this.fetchAnalytics();
    const hasSeenWelcome = localStorage.getItem('seenWelcomeGuide');

    if (!hasSeenWelcome) {
      this.showWelcomeInfoModal = true;
    }
  }

  closeWelcomeInfo() {
    this.showWelcomeInfoModal = false;

    localStorage.setItem('seenWelcomeGuide', 'true');
  }
  displayWelcomeInfo() {
    this.showWelcomeInfoModal = true;
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
      // error: (err) => console.error('Error fetching analytics', err)
    });
  }

  onPromotedIdeaClick(idea: PromotedIdea) {
  if (!idea.projectId) return;

  this.router.navigate(['/projects'], {
    queryParams: { openProject: idea.projectId }
  });
}
}
